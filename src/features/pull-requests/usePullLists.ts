'use client';

import { useStandingPulls, useStandingRepoPulls } from './pullActionStore';
import type { PullAttention } from './pullAttention';
import { listedPulls, sortListedPulls, usePullFilters } from './pullFilterStore';
import { repoPullsPath, type PullState } from './pullPaths';
import type { CrossRepoPull, PullRequestSummary } from './pullRequests';
import { usePullSort } from './pullSortStore';
import { crossRepoSeenKey, pullSeenKey } from './seenPullStore';
import { useAllPullRequests, type AllPullRequests } from './useAllPullRequests';
import { useAttentionReader } from './usePullAttention';
import { useIsOwnAuthor } from '@/features/github-auth/useViewerLogin';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export function useRepoPullList(owner: string, repo: string) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { state } = usePullFilters();
  const { data, error } = useCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo, state), token, ready);
  const standing = useStandingRepoPulls(owner, repo, data);
  const attentionOf = useAttentionReader<PullRequestSummary>((pull) => pullSeenKey(owner, repo, pull.number));
  return { pulls: data, listed: useListedPulls(standing, attentionOf), attentionOf, error };
}

export function useAllPullList(): AllPullRequests & {
  state: PullState;
  listed: CrossRepoPull[];
  attentionOf: (pull: CrossRepoPull) => PullAttention;
} {
  const all = useAllPullRequests();
  const { state } = usePullFilters();
  const standing = useStandingPulls(all.found?.pulls);
  const attentionOf = useAttentionReader<CrossRepoPull>(crossRepoSeenKey);
  return { ...all, state, listed: useListedPulls(standing, attentionOf), attentionOf };
}

function useListedPulls<T extends PullRequestSummary>(pulls: T[], attentionOf: (pull: T) => PullAttention): T[] {
  const filtered = listedPulls(pulls, usePullFilters(), useIsOwnAuthor());
  return sortListedPulls(filtered, usePullSort(), attentionOf);
}
