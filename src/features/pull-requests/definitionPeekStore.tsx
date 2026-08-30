'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { definitionView, scanChangedFiles, type PeekView } from './definitionContext';
import { refineSite, resolveDefinition, type DefinitionSite, type ResolverFiles } from './definitionResolver';
import { fileTextPath, repoFilesAtRefPath } from './pullPaths';
import type { ChangedFileSet, FileText } from './pullRequests';
import type { RepoFileSet } from './repoFiles';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';

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
  word: string;
  site: DefinitionSite | null;
  sites: DefinitionSite[];
  view: PeekView | null;
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

export function DefinitionPeekProvider({
  owner,
  repo,
  fileSet,
  children,
}: {
  owner: string;
  repo: string;
  fileSet: ChangedFileSet | null;
  children: ReactNode;
}) {
  const [session, setSession] = useState<PeekSession | null>(null);
  const generation = useRef(0);
  const fileSetRef = useRef(fileSet);
  fileSetRef.current = fileSet;
  const files = useResolverFiles(owner, repo);

  const replaceTop = useCallback((frame: PeekFrame) => {
    setSession((held) => held && { ...held, frames: [...held.frames.slice(0, -1), frame] });
  }, []);

  const showSite = useCallback(
    async (site: DefinitionSite, sites: DefinitionSite[], word: string, wanted: number) => {
      try {
        const refined = site.rough ? await refineSite(site, word, files) : site;
        const view = await definitionView(refined, fileSetRef.current, files.readFile);
        if (wanted !== generation.current) return;
        replaceTop({ word, site: refined, sites, view, note: view ? null : 'file unavailable', loading: false });
      } catch (issue: unknown) {
        if (wanted === generation.current) replaceTop(emptyFrame(word, describe(issue)));
      }
    },
    [files, replaceTop],
  );

  const load = useCallback(
    async (origin: PeekOrigin, wanted: number) => {
      const found = await resolveDefinition(origin, files).catch(failedResolution);
      const sites = withPatchFallback(found.sites, found.note, origin, fileSetRef.current);
      if (wanted !== generation.current) return;
      const first = sites[0];
      if (!first) return replaceTop(emptyFrame(origin.word, found.note));
      await showSite(first, sites, origin.word, wanted);
    },
    [files, replaceTop, showSite],
  );

  const open = useCallback(
    (origin: PeekOrigin, anchor: PeekAnchor) => {
      const wanted = ++generation.current;
      setSession({ anchor, frames: [loadingFrame(origin.word)] });
      void load(origin, wanted);
    },
    [load],
  );

  const push = useCallback(
    (origin: PeekOrigin) => {
      const wanted = ++generation.current;
      setSession((held) => held && { ...held, frames: [...held.frames, loadingFrame(origin.word)] });
      void load(origin, wanted);
    },
    [load],
  );

  const pick = useCallback(
    (site: DefinitionSite, from: PeekFrame) => {
      const wanted = ++generation.current;
      setSession((held) => held && { ...held, frames: [...held.frames.slice(0, -1), { ...from, loading: true }] });
      void showSite(site, from.sites, from.word, wanted);
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

  const actions = useMemo(() => ({ open, push, pick, back, close }), [open, push, pick, back, close]);
  const shown = useMemo(() => ({ session, fileSet }), [session, fileSet]);
  return (
    <PeekActionsContext value={actions}>
      <PeekShownContext value={shown}>{children}</PeekShownContext>
    </PeekActionsContext>
  );
}

function loadingFrame(word: string): PeekFrame {
  return { word, site: null, sites: [], view: null, note: null, loading: true };
}

function emptyFrame(word: string, note: string | null): PeekFrame {
  return { word, site: null, sites: [], view: null, note: note ?? `no definition found for ${word}`, loading: false };
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

interface RefListing {
  names: Set<string>;
  truncated: boolean;
}

function useResolverFiles(owner: string, repo: string): ResolverFiles {
  const token = useGithubToken();
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const texts = useRef(new Map<string, Promise<string | null>>());
  const listings = useRef(new Map<string, Promise<RefListing | null>>());
  return useMemo(
    () => makeResolverFiles(owner, repo, tokenRef, texts.current, listings.current),
    [owner, repo],
  );
}

function makeResolverFiles(
  owner: string,
  repo: string,
  token: { current: string | null },
  texts: Map<string, Promise<string | null>>,
  listings: Map<string, Promise<RefListing | null>>,
): ResolverFiles {
  const readFile = (ref: string, path: string) =>
    once(texts, `${owner}/${repo}\0${ref}\0${path}`, () =>
      apiJson<FileText>(fileTextPath(owner, repo, ref, path), token.current).then((got) => got.text),
    );
  const listFiles = (ref: string) =>
    once(listings, `${owner}/${repo}\0${ref}`, () =>
      apiJson<RepoFileSet>(repoFilesAtRefPath(owner, repo, ref), token.current).then((got) => ({
        names: new Set(got.files),
        truncated: got.truncated,
      })),
    );
  const hasFile = async (ref: string, path: string) => {
    const listing = await listFiles(ref);
    if (listing?.names.has(path)) return true;
    if (listing && !listing.truncated) return false;
    return (await readFile(ref, path)) !== null;
  };
  return { readFile, hasFile };
}

function once<T>(held: Map<string, Promise<T | null>>, key: string, work: () => Promise<T | null>): Promise<T | null> {
  const running = held.get(key);
  if (running) return running;
  const started = work().catch(() => {
    held.delete(key);
    return null;
  });
  held.set(key, started);
  return started;
}
