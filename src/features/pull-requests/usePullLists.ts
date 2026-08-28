'use client';

import { useStandingPulls, useStandingRepoPulls } from './pullActionStore';
import { useListedPulls, usePullQueryState } from './pullFilterStore';
import { repoPullsPath } from './pullPaths';
import type { CrossRepoPull, PullRequestSummary } from './pullRequests';
import { useAllPullRequests, type AllPullRequests } from './useAllPullRequests';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export interface RepoPullList {
  pulls: PullRequestSummary[] | null;
  listed: PullRequestSummary[];
  error: string | null;
}

export function useRepoPullList(owner: string, repo: string): RepoPullList {
  const ready = useStoreReady();
  const token = useGithubToken();
  const state = usePullQueryState();
  const { data, error } = useCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo, state), token, ready);
  const standing = useStandingRepoPulls(owner, repo, data);
  return { pulls: data, listed: useListedPulls(standing), error };
}

export function useAllPullList(): AllPullRequests & { listed: CrossRepoPull[] } {
  const all = useAllPullRequests();
  const standing = useStandingPulls(all.found?.pulls);
  return { ...all, listed: useListedPulls(standing) };
}
