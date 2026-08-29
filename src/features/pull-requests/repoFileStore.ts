'use client';

import { repoFilesPath } from './pullPaths';
import type { RepoFileSet } from './repoFiles';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export interface RepoFiles {
  fileSet: RepoFileSet | null;
  error: string | null;
}

export function useRepoFiles(owner: string, repo: string, wanted: boolean): RepoFiles {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data, error } = useCachedJson<RepoFileSet>(wanted ? repoFilesPath(owner, repo) : null, token, ready);
  return { fileSet: data, error };
}
