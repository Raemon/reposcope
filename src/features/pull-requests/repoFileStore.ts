'use client';

import { repoFilesPath, repoLinesPath } from './pullPaths';
import type { RepoLineCounts } from './repoLineCounts';
import type { RepoFileSet } from './repoFiles';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export interface RepoFiles {
  fileSet: RepoFileSet | null;
  lineCounts: Record<string, number> | null;
  error: string | null;
}

export function useRepoFiles(owner: string, repo: string, wanted: boolean): RepoFiles {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data, error } = useCachedJson<RepoFileSet>(wanted ? repoFilesPath(owner, repo) : null, token, ready);
  const counted = useCachedJson<RepoLineCounts>(data ? repoLinesPath(owner, repo, data.sha) : null, token, ready);
  return { fileSet: data, lineCounts: counted.data?.lines ?? null, error };
}
