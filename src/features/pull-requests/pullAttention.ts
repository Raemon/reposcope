import { listedPulls, type PullFilters } from './pullFilterStore';
import type { PullRequestSummary } from './pullRequests';
import type { SeenPull, SeenPulls } from './seenPullStore';

export type PullAttention = 'review' | 'changed' | 'new' | 'seen' | 'draft';

export interface AttentionSignals {
  seen: SeenPull | undefined;
  isViewer: (login: string) => boolean;
}

export interface AttentionSources {
  seen: SeenPulls;
  isViewer: (login: string) => boolean;
}

const ORDER: PullAttention[] = ['review', 'changed', 'new', 'seen', 'draft'];

export function pullAttentionOf(pull: PullRequestSummary, { seen, isViewer }: AttentionSignals): PullAttention {
  if (pull.state !== 'open') return 'seen';
  if (pull.requestedReviewers.some(isViewer)) return 'review';
  if (pull.draft) return 'draft';
  if (!seen) return 'new';
  return changedSinceSeen(pull, seen) ? 'changed' : 'seen';
}

function changedSinceSeen(pull: PullRequestSummary, seen: SeenPull): boolean {
  return pull.headSha !== seen.sha && Date.parse(pull.updatedAt) > seen.at;
}

export function attentionReader<T extends PullRequestSummary>(
  keyOf: (pull: T) => string,
  { seen, isViewer }: AttentionSources,
): (pull: T) => PullAttention {
  return (pull) => pullAttentionOf(pull, { seen: seen[keyOf(pull)], isViewer });
}

export function attentionListing<T extends PullRequestSummary>(
  pulls: T[],
  keyOf: (pull: T) => string,
  filters: PullFilters,
  sources: AttentionSources,
): { listed: T[]; attentionOf: (pull: T) => PullAttention } {
  const attentionOf = attentionReader(keyOf, sources);
  const kept = listedPulls(pulls, filters, sources.isViewer);
  return { listed: filters.sort === 'updated' ? kept : byAttention(kept, attentionOf), attentionOf };
}

function byAttention<T extends PullRequestSummary>(pulls: T[], attentionOf: (pull: T) => PullAttention): T[] {
  const ranked = pulls.map((pull) => ({ pull, rank: ORDER.indexOf(attentionOf(pull)) }));
  ranked.sort((a, b) => a.rank - b.rank || b.pull.updatedAt.localeCompare(a.pull.updatedAt));
  return ranked.map((entry) => entry.pull);
}
