'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { isTypescriptPath } from './codeIntelTypes';
import { useResolverFiles } from './resolverFiles';
import { codeIntelClient, type CodeIntelClient } from './tsClient';
import type { ResolverFiles } from '@/features/pull-requests/definitionResolver';
import type { ChangedFile, ChangedFileSet } from '@/features/pull-requests/pullRequests';

export interface CodeIntel {
  files: ResolverFiles;
  client: CodeIntelClient;
}

const MAX_WARM_SEEDS = 20;

const CodeIntelContext = createContext<CodeIntel | null>(null);

export function useCodeIntel(): CodeIntel {
  const held = useContext(CodeIntelContext);
  if (!held) throw new Error('useCodeIntel needs a CodeIntelProvider');
  return held;
}

export function CodeIntelProvider({
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
  const files = useResolverFiles(owner, repo);
  const client = useMemo(() => codeIntelClient(owner, repo), [owner, repo]);
  useEffect(() => client.attach(files), [client, files]);

  useWarmUp(client, fileSet);
  const value = useMemo(() => ({ files, client }), [files, client]);
  return <CodeIntelContext value={value}>{children}</CodeIntelContext>;
}

function useWarmUp(client: CodeIntelClient, fileSet: ChangedFileSet | null) {
  useEffect(() => {
    if (!fileSet) return;
    warmBothSides(client, fileSet).catch((issue: unknown) => console.warn('code intel warm-up failed', issue));
  }, [client, fileSet]);
}

async function warmBothSides(client: CodeIntelClient, fileSet: ChangedFileSet) {
  const head = changedTypescriptPaths(fileSet, fileSet.headRef);
  if (head.length > 0) await client.warm(fileSet.headRef, head);
  const base = changedTypescriptPaths(fileSet, fileSet.baseRef);
  if (base.length > 0 && fileSet.baseRef !== fileSet.headRef) await client.warm(fileSet.baseRef, base);
}

export function changedTypescriptPaths(fileSet: ChangedFileSet | null, ref: string): string[] {
  if (!fileSet || (ref !== fileSet.headRef && ref !== fileSet.baseRef)) return [];
  const pathOf = (file: ChangedFile) => (ref === fileSet.headRef ? file.filename : file.previousFilename ?? file.filename);
  return fileSet.files.map(pathOf).filter(isTypescriptPath).slice(0, MAX_WARM_SEEDS);
}
