'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { branchBeingRead, pullBeingRead, repoBeingRead } from './repoPaths';
import { useCurrentPull } from '@/features/pull-requests/currentPullStore';
import type { RepoRef } from '@/features/sources/parseRepoLink';

const SUFFIX = 'reposcope';
export const DEFAULT_TITLE = `${SUFFIX} — pull request viewer`;

export function DocumentTitle() {
  const pathname = usePathname() ?? '';
  const repo = repoBeingRead(pathname);
  const number = pullBeingRead(pathname);
  const loaded = useCurrentPull(repo?.owner ?? '', repo?.name ?? '', number ?? 0);
  useDocumentTitle(titleFor(pathname, repo, number, loaded?.pull.title ?? null));
  return null;
}

function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function titleFor(pathname: string, repo: RepoRef | null, number: number | null, pullTitle: string | null): string {
  if (!repo) return pathname === '/pulls' ? `All pull requests · ${SUFFIX}` : DEFAULT_TITLE;
  const scope = `${repo.owner}/${repo.name} · ${SUFFIX}`;
  if (number !== null) return `#${number}${pullTitle ? ` ${pullTitle}` : ''} · ${scope}`;
  const branch = branchBeingRead(pathname);
  return branch ? `${branch} · ${scope}` : scope;
}
