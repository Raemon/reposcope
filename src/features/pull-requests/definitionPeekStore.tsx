'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { definitionView, scanChangedFiles, type PeekView } from './definitionContext';
import { refineSite, resolveDefinition, type DefinitionSite, type Resolution, type ResolverFiles } from './definitionResolver';
import type { ChangedFileSet } from './pullRequests';
import { changedTypescriptPaths, useCodeIntel } from '@/features/code-intel/codeIntelStore';
import { isTypescriptPath, type ReferenceSite } from '@/features/code-intel/codeIntelTypes';
import type { CodeIntelClient } from '@/features/code-intel/tsClient';

export interface PeekOrigin {
  path: string;
  ref: string;
  line: number;
  column: number;
  word: string;
}

export interface PeekAnchor {
  x: number;
  y: number;
}

export interface PeekFrame {
  origin: PeekOrigin;
  site: DefinitionSite | null;
  sites: DefinitionSite[];
  view: PeekView | null;
  references: ReferenceSite[] | null;
  note: string | null;
  loading: boolean;
}

export interface PeekSession {
  anchor: PeekAnchor;
  frames: PeekFrame[];
}

export interface PeekActions {
  open(origin: PeekOrigin, anchor: PeekAnchor): void;
  push(origin: PeekOrigin): void;
  pick(site: DefinitionSite, from: PeekFrame): void;
  references(from: PeekFrame): void;
  openReferences(origin: PeekOrigin, anchor: PeekAnchor): void;
  jump(site: ReferenceSite, from: PeekFrame): void;
  back(): void;
  close(): void;
}

export interface PeekShown {
  session: PeekSession | null;
  fileSet: ChangedFileSet | null;
}

const PeekActionsContext = createContext<PeekActions | null>(null);
const PeekShownContext = createContext<PeekShown | null>(null);

export function useDefinitionPeekActions(): PeekActions | null {
  return useContext(PeekActionsContext);
}

export function useDefinitionPeekShown(): PeekShown | null {
  return useContext(PeekShownContext);
}

export function DefinitionPeekProvider({ fileSet, children }: { fileSet: ChangedFileSet | null; children: ReactNode }) {
  const [session, setSession] = useState<PeekSession | null>(null);
  const generation = useRef(0);
  const fileSetRef = useRef(fileSet);
  fileSetRef.current = fileSet;
  const { files, client } = useCodeIntel();

  const replaceTop = useCallback((frame: PeekFrame) => {
    setSession((held) => held && { ...held, frames: [...held.frames.slice(0, -1), frame] });
  }, []);

  const settle = useCallback(
    async (origin: PeekOrigin, wanted: number, work: () => Promise<PeekFrame>) => {
      const frame = await work().catch((issue: unknown) => emptyFrame(origin, describe(issue)));
      if (wanted === generation.current) replaceTop(frame);
    },
    [replaceTop],
  );

  const showSite = useCallback(
    (site: DefinitionSite, sites: DefinitionSite[], origin: PeekOrigin, wanted: number) =>
      settle(origin, wanted, () => siteFrame(site, sites, origin, files, fileSetRef.current)),
    [files, settle],
  );

  const load = useCallback(
    (origin: PeekOrigin, wanted: number) =>
      settle(origin, wanted, () => firstSiteFrame(origin, client, files, fileSetRef.current)),
    [client, files, settle],
  );

  const open = useCallback(
    (origin: PeekOrigin, anchor: PeekAnchor) => {
      const wanted = ++generation.current;
      setSession({ anchor, frames: [loadingFrame(origin)] });
      void load(origin, wanted);
    },
    [load],
  );

  const push = useCallback(
    (origin: PeekOrigin) => {
      const wanted = ++generation.current;
      setSession((held) => held && { ...held, frames: [...held.frames, loadingFrame(origin)] });
      void load(origin, wanted);
    },
    [load],
  );

  const pick = useCallback(
    (site: DefinitionSite, from: PeekFrame) => {
      const wanted = ++generation.current;
      setSession((held) => held && { ...held, frames: [...held.frames.slice(0, -1), { ...from, loading: true }] });
      void showSite(site, from.sites, from.origin, wanted);
    },
    [showSite],
  );

  const listReferences = useCallback(
    (origin: PeekOrigin, wanted: number) =>
      settle(origin, wanted, async () => {
        const seeds = changedTypescriptPaths(fileSetRef.current, origin.ref);
        return referencesFrame(origin, await client.references(origin, seeds));
      }),
    [client, settle],
  );

  const references = useCallback(
    (from: PeekFrame) => {
      const wanted = ++generation.current;
      setSession((held) => held && { ...held, frames: [...held.frames, loadingFrame(from.origin)] });
      void listReferences(from.origin, wanted);
    },
    [listReferences],
  );

  const openReferences = useCallback(
    (origin: PeekOrigin, anchor: PeekAnchor) => {
      const wanted = ++generation.current;
      setSession({ anchor, frames: [loadingFrame(origin)] });
      void listReferences(origin, wanted);
    },
    [listReferences],
  );

  const jump = useCallback(
    (site: ReferenceSite, from: PeekFrame) => {
      const wanted = ++generation.current;
      const origin = { path: site.path, ref: site.ref, line: site.line, column: site.column, word: from.origin.word };
      setSession((held) => held && { ...held, frames: [...held.frames, loadingFrame(origin)] });
      void showSite(contextSite(site), [contextSite(site)], origin, wanted);
    },
    [showSite],
  );

  const back = useCallback(() => {
    generation.current += 1;
    setSession((held) => (held && held.frames.length > 1 ? { ...held, frames: held.frames.slice(0, -1) } : null));
  }, []);

  const close = useCallback(() => {
    generation.current += 1;
    setSession(null);
  }, []);

  const actions = useMemo(
    () => ({ open, push, pick, references, openReferences, jump, back, close }),
    [open, push, pick, references, openReferences, jump, back, close],
  );
  const shown = useMemo(() => ({ session, fileSet }), [session, fileSet]);
  return (
    <PeekActionsContext value={actions}>
      <PeekShownContext value={shown}>{children}</PeekShownContext>
    </PeekActionsContext>
  );
}

function loadingFrame(origin: PeekOrigin): PeekFrame {
  return { origin, site: null, sites: [], view: null, references: null, note: null, loading: true };
}

function referencesFrame(origin: PeekOrigin, references: ReferenceSite[]): PeekFrame {
  const note = references.length === 0 ? `no references found for ${origin.word}` : null;
  return { ...loadingFrame(origin), references, note, loading: false };
}

const REFERENCE_CONTEXT = { before: 6, after: 8 };

function contextSite(site: ReferenceSite): DefinitionSite {
  const startLine = Math.max(1, site.line - REFERENCE_CONTEXT.before);
  return { path: site.path, ref: site.ref, nameLine: site.line, startLine, endLine: site.line + REFERENCE_CONTEXT.after };
}

function emptyFrame(origin: PeekOrigin, note: string | null): PeekFrame {
  return { ...loadingFrame(origin), note: note ?? `no definition found for ${origin.word}`, loading: false };
}

async function siteFrame(
  site: DefinitionSite,
  sites: DefinitionSite[],
  origin: PeekOrigin,
  files: ResolverFiles,
  fileSet: ChangedFileSet | null,
): Promise<PeekFrame> {
  const refined = site.rough ? await refineSite(site, origin.word, files) : site;
  const view = await definitionView(refined, fileSet, files.readFile);
  return { ...loadingFrame(origin), site: refined, sites, view, note: view ? null : 'file unavailable', loading: false };
}

async function firstSiteFrame(
  origin: PeekOrigin,
  client: CodeIntelClient,
  files: ResolverFiles,
  fileSet: ChangedFileSet | null,
): Promise<PeekFrame> {
  const found = await resolveAnywhere(origin, client, files);
  const sites = withPatchFallback(found.sites, found.note, origin, fileSet);
  const first = sites[0];
  return first ? siteFrame(first, sites, origin, files, fileSet) : emptyFrame(origin, found.note);
}

async function resolveAnywhere(origin: PeekOrigin, client: CodeIntelClient, files: ResolverFiles): Promise<Resolution> {
  const typed = isTypescriptPath(origin.path) ? await typedResolution(origin, client) : null;
  if (typed && typed.sites.length > 0) return typed;
  const heuristic = await resolveDefinition(origin, files).catch(failedResolution);
  const heuristicAnswered = heuristic.sites.length > 0 || heuristic.note !== null;
  return heuristicAnswered ? heuristic : typed ?? heuristic;
}

async function typedResolution(origin: PeekOrigin, client: CodeIntelClient): Promise<Resolution> {
  try {
    return { sites: await client.definition(origin), note: null };
  } catch (issue: unknown) {
    console.warn('typed definition failed, falling back to tree-sitter', issue);
    return { sites: [], note: describe(issue) };
  }
}

function describe(issue: unknown): string {
  return issue instanceof Error ? issue.message : String(issue);
}

function failedResolution(issue: unknown): { sites: DefinitionSite[]; note: string } {
  return { sites: [], note: describe(issue) };
}

function withPatchFallback(
  sites: DefinitionSite[],
  note: string | null,
  origin: PeekOrigin,
  fileSet: ChangedFileSet | null,
): DefinitionSite[] {
  if (sites.length > 0 || note !== null || !fileSet) return sites;
  return scanChangedFiles(fileSet, origin.word, origin.path);
}
