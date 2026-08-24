'use client';

import { useMemo } from 'react';
import type { CrossRepoPulls } from './pullRequests';
import { sidebarGroups } from '@/features/codebases/sidebarGroups';
import { useSourceResults } from '@/features/codebases/useSourceResults';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const MAX_REPOS = 60;
export const ALL_PULLS_CACHE_KEY = 'all-pulls';

export interface AllPullRequests {
  scanning: boolean;
  repoCount: number;
  found: CrossRepoPulls | null;
  error: string | null;
}

export function useAllPullRequests(): AllPullRequests {
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const results = useSourceResults(sources, token, ready);
  const groups = useMemo(() => sidebarGroups(sources, results), [sources, results]);
  const repos = useMemo(() => knownRepos(groups), [groups]);
  const target = repos.map((repo) => `${repo.owner}/${repo.name}`).join(',');
  const path = target === '' ? null : `/api/github/all-pulls?repos=${encodeURIComponent(target)}`;
  const { data, fresh, error } = useCachedJson<CrossRepoPulls>(path, token, ready, ALL_PULLS_CACHE_KEY);

  return {
    scanning: !ready || groups.some((group) => group.loading) || (path !== null && !fresh),
    repoCount: repos.length,
    found: data,
    error,
  };
}

function knownRepos(groups: ReturnType<typeof sidebarGroups>): RepoRef[] {
  return groups
    .flatMap((group) => group.repos)
    .filter((repo) => repo.updatedAt !== '')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_REPOS)
    .map((repo) => ({ owner: repo.owner, name: repo.name }));
}
