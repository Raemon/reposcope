import type { PullRequestSummary } from './pullRequests';

export type PullAttention = 'review' | 'new' | 'changed' | 'seen' | 'draft';

const ORDER: PullAttention[] = ['review', 'new', 'changed', 'seen', 'draft'];

export function pullAttentionOf(
  pull: PullRequestSummary,
  seenSha: string | undefined,
  isViewer: (login: string) => boolean,
): PullAttention {
  if (pull.state !== 'open') return 'seen';
  if (pull.requestedReviewers.some(isViewer)) return 'review';
  if (pull.draft) return 'draft';
  if (seenSha === undefined) return 'new';
  return seenSha === pull.headSha ? 'seen' : 'changed';
}

export function attentionRank(attention: PullAttention): number {
  return ORDER.indexOf(attention);
}

export function attentionReader<T extends PullRequestSummary>(
  keyOf: (pull: T) => string,
  seen: Record<string, string>,
  isViewer: (login: string) => boolean,
): (pull: T) => PullAttention {
  return (pull) => pullAttentionOf(pull, seen[keyOf(pull)], isViewer);
}
