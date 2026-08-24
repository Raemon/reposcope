'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CrossRepoPulls } from './pullRequests';
import { sidebarGroups } from '@/features/codebases/sidebarGroups';
import { useSourceResults } from '@/features/codebases/useSourceResults';
import { apiJson } from '@/features/sources/apiClient';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';

const MAX_REPOS = 60;

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
  const scanning = !ready || groups.some((group) => group.loading);
  const repos = useMemo(() => knownRepos(groups), [groups]);
  const target = repos.map((repo) => `${repo.owner}/${repo.name}`).join(',');
  const [found, setFound] = useState<{ target: string; pulls: CrossRepoPulls } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || target === '') return;
    const controller = new AbortController();
    setError(null);
    apiJson<CrossRepoPulls>(`/api/github/all-pulls?repos=${encodeURIComponent(target)}`, token, controller.signal)
      .then((pulls) => setFound({ target, pulls }))
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [target, token, ready]);

  return {
    scanning: scanning || (target !== '' && found?.target !== target && error === null),
    repoCount: repos.length,
    found: found?.pulls ?? null,
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
