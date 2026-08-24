'use client';

import { pullPath, repoPullsPath } from './pullPaths';
import type { CrossRepoPulls, PullRequestCommits, PullRequestSummary } from './pullRequests';
import { ALL_PULLS_KEY } from './useAllPullRequests';
import { expectChange } from '@/features/sources/optimisticJson';

export function expectMergedPull(owner: string, repo: string, number: number): void {
  const listKey = repoPullsPath(owner, repo);
  const pullKey = pullPath(owner, repo, number);
  expectChange({
    id: `merged ${owner}/${repo}#${number}`,
    keys: [pullKey, listKey, ALL_PULLS_KEY],
    revise: (key, data) => {
      if (key === pullKey) return asMerged(data as PullRequestCommits);
      if (key === listKey) return withoutNumber(data as PullRequestSummary[], number);
      return withoutCrossRepoPull(data as CrossRepoPulls, owner, repo, number);
    },
  });
}

function asMerged(held: PullRequestCommits): PullRequestCommits {
  if (held.pull.merged) return held;
  return { ...held, pull: { ...held.pull, merged: true, state: 'closed' } };
}

function withoutNumber(pulls: PullRequestSummary[], number: number): PullRequestSummary[] {
  const kept = pulls.filter((pull) => pull.number !== number);
  return kept.length === pulls.length ? pulls : kept;
}

function withoutCrossRepoPull(found: CrossRepoPulls, owner: string, repo: string, number: number): CrossRepoPulls {
  const kept = found.pulls.filter(
    (pull) => pull.number !== number || pull.owner !== owner || pull.repo !== repo,
  );
  return kept.length === found.pulls.length ? found : { ...found, pulls: kept };
}
