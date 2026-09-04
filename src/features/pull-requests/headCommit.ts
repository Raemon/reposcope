import type { ChangeSummary, CommitSummary } from './pullRequests';

export function headCommit(change: ChangeSummary): CommitSummary | null {
  return change.commits[change.commits.length - 1] ?? null;
}
