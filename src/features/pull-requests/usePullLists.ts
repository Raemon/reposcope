'use client';

import { useStandingPulls, useStandingRepoPulls } from './pullActionStore';
import { attentionListing, type PullAttention } from './pullAttention';
import { usePullFilters } from './pullFilterStore';
import { repoPullsPath, type PullState } from './pullPaths';
import type { CrossRepoPull, PullRequestSummary } from './pullRequests';
import { crossRepoSeenKey, pullSeenKey, useSeenPulls } from './seenPullStore';
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
  const keyOf = (pull: PullRequestSummary) => pullSeenKey(owner, repo, pull.number);
  return { pulls: data, ...useAttentionListing(standing, keyOf), error };
}

export function useAllPullList(): AllPullRequests & {
  state: PullState;
  listed: CrossRepoPull[];
  attentionOf: (pull: CrossRepoPull) => PullAttention;
} {
  const all = useAllPullRequests();
  const { state } = usePullFilters();
  const standing = useStandingPulls(all.found?.pulls);
  return { ...all, state, ...useAttentionListing(standing, crossRepoSeenKey) };
}

function useAttentionListing<T extends PullRequestSummary>(pulls: T[], keyOf: (pull: T) => string) {
  return attentionListing(pulls, keyOf, usePullFilters(), { seen: useSeenPulls(), isViewer: useIsOwnAuthor() });
}
