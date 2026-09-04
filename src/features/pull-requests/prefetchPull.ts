'use client';

import { pullCommentsPath, pullFilesPath, pullPath, pullThreadsPath } from './pullPaths';
import { prefetchJson } from '@/features/sources/useCachedJson';

export function prefetchPull(owner: string, repo: string, number: number, token: string | null): void {
  prefetchJson(pullPath(owner, repo, number), token);
  prefetchJson(pullFilesPath(owner, repo, number), token);
  prefetchJson(pullCommentsPath(owner, repo, number), token);
  prefetchJson(pullThreadsPath(owner, repo, number), token);
}
