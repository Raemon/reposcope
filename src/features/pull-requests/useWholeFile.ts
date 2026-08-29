'use client';

import { useEffect, useState } from 'react';
import { splitLines } from './expandDiff';
import type { ChangedFile, FileText } from './pullRequests';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';

export interface WholeFile {
  available: boolean;
  loading: boolean;
  error: string | null;
  lines: { base: string[]; head: string[] } | null;
}

export function hunkHint(wholeFile: WholeFile, expanded: boolean): string {
  if (!wholeFile.available) return '';
  if (wholeFile.error) return wholeFile.error;
  if (wholeFile.loading) return 'loading whole file…';
  return expanded ? 'whole file — click to show changed lines only' : 'click to show whole file';
}

export function useWholeFile(
  owner: string,
  repo: string,
  file: ChangedFile,
  baseRef: string,
  headRef: string,
  wanted: boolean,
): WholeFile {
  const token = useGithubToken();
  const identity = `${baseRef}\0${headRef}\0${file.previousFilename ?? file.filename}\0${file.filename}`;
  const [held, setHeld] = useState<{ identity: string; lines: { base: string[]; head: string[] } } | null>(null);
  const [failure, setFailure] = useState<{ identity: string; message: string } | null>(null);
  const available = file.status !== 'added' && file.status !== 'removed';
  const lines = held?.identity === identity ? held.lines : null;
  const error = failure?.identity === identity ? failure.message : null;

  useEffect(() => {
    if (!wanted || !available) return;
    const controller = new AbortController();
    loadBothSides(owner, repo, identity, token, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setHeld({ identity, lines: loaded });
      })
      .catch((issue: unknown) => {
        if (controller.signal.aborted) return;
        setFailure({ identity, message: issue instanceof Error ? issue.message : String(issue) });
      });
    return () => controller.abort();
  }, [wanted, available, identity, owner, repo, token]);

  return { available, loading: wanted && !lines && !error, error, lines: wanted ? lines : null };
}

async function loadBothSides(
  owner: string,
  repo: string,
  identity: string,
  token: string | null,
  signal: AbortSignal,
): Promise<{ base: string[]; head: string[] }> {
  const [baseRef, headRef, basePath, headPath] = identity.split('\0');
  const [base, head] = await Promise.all([
    readText(owner, repo, baseRef ?? '', basePath ?? '', token, signal),
    readText(owner, repo, headRef ?? '', headPath ?? '', token, signal),
  ]);
  if (base.text === null || head.text === null) throw new Error('file too large to expand');
  return { base: splitLines(base.text), head: splitLines(head.text) };
}

function readText(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  token: string | null,
  signal: AbortSignal,
): Promise<FileText> {
  const query = `owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`;
  return apiJson<FileText>(`/api/github/file?${query}`, token, signal);
}
