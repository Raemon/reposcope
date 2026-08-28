'use client';

import { useMemo } from 'react';
import { usePullQueryState } from './pullFilterStore';
import type { PullState } from './pullPaths';
import type { CrossRepoPulls } from './pullRequests';
import { sidebarGroups } from '@/features/codebases/sidebarGroups';
import { useSourceResults } from '@/features/codebases/useSourceResults';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubAccess, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const MAX_REPOS = 60;
export function allPullsCacheKey(state: PullState): string {
  return `all-pulls ${state}`;
}

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
  const access = useGithubAccess();
  const results = useSourceResults(sources, token, ready, access);
  const groups = useMemo(() => sidebarGroups(sources, results), [sources, results]);
  const repos = useMemo(() => knownRepos(groups), [groups]);
  const target = repos.map((repo) => `${repo.owner}/${repo.name}`).join(',');
  const state = usePullQueryState();
  const path = target === '' ? null : `/api/github/all-pulls?repos=${encodeURIComponent(target)}&state=${state}`;
  const { data, fresh, error } = useCachedJson<CrossRepoPulls>(path, token, ready, allPullsCacheKey(state));

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
