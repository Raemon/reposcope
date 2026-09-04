import type { PullRequestSummary } from './pullRequests';

export function pullStateTags(pull: Pick<PullRequestSummary, 'draft' | 'state' | 'merged'>): string[] {
  const tags = pull.draft ? ['draft'] : [];
  if (pull.state !== 'open') tags.push(pull.merged ? 'merged' : 'closed');
  return tags;
}
