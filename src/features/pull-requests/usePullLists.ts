'use client';

import { useStandingPulls, useStandingRepoPulls } from './pullActionStore';
import { listedPulls, usePullFilters } from './pullFilterStore';
import { repoPullsPath, type PullState } from './pullPaths';
import type { CrossRepoPull, PullRequestSummary } from './pullRequests';
import { useAllPullRequests, type AllPullRequests } from './useAllPullRequests';
import { useIsOwnAuthor } from '@/features/github-auth/useViewerLogin';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export function useRepoPullList(owner: string, repo: string) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { state } = usePullFilters();
  const { data, error } = useCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo, state), token, ready);
  const standing = useStandingRepoPulls(owner, repo, data);
  return { pulls: data, listed: useListedPulls(standing), error };
}

export function useAllPullList(): AllPullRequests & { state: PullState; listed: CrossRepoPull[] } {
  const all = useAllPullRequests();
  const { state } = usePullFilters();
  const standing = useStandingPulls(all.found?.pulls);
  return { ...all, state, listed: useListedPulls(standing) };
}

function useListedPulls<T extends PullRequestSummary>(pulls: T[]): T[] {
  return listedPulls(pulls, usePullFilters(), useIsOwnAuthor());
}
