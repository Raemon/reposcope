'use client';

import { SHEET_GUTTER } from './centralLayout';
import type { PullRequestCommits } from './pullRequests';
import { timeAgo } from '@/features/surface-ui/timeAgo';

const PILL = 'shrink-0 rounded-full border px-2 py-[1px] text-label uppercase';

export function PullIdentity({ pull }: { pull: PullRequestCommits }) {
  return (
    <div className={`shrink-0 pt-4 pb-3 ${SHEET_GUTTER}`}>
      <div className="flex items-baseline gap-2.5">
        <span className="shrink-0 text-meta text-ink-dim">#{pull.pull.number}</span>
        <h1 className="min-w-0 flex-1 font-serif text-title text-ink">{pull.pull.title}</h1>
        <StatePill pull={pull} />
      </div>
      <div className="mt-1.5 flex items-baseline gap-x-2.5 gap-y-1 text-meta text-ink-dim">
        <span className="text-ink">{pull.pull.author}</span>
        <Dot />
        <span className="min-w-0 truncate">
          {pull.headRef} <span className="opacity-50">→</span> {pull.baseRef}
        </span>
        <Dot />
        <span>{timeAgo(pull.pull.updatedAt)}</span>
        <span className="ml-auto flex shrink-0 gap-x-2">
          <span className="text-add-ink">+{pull.additions}</span>
          <span className="text-del-ink">−{pull.deletions}</span>
        </span>
      </div>
    </div>
  );
}

function StatePill({ pull }: { pull: PullRequestCommits }) {
  const [label, tone] = stateOf(pull);
  return <span className={`${PILL} ${tone}`}>{label}</span>;
}

function stateOf(pull: PullRequestCommits): [string, string] {
  if (pull.pull.merged) return ['merged', 'border-scope text-scope'];
  if (pull.pull.state !== 'open') return ['closed', 'border-danger-edge text-danger-ink'];
  if (pull.pull.draft) return ['draft', 'border-panel-edge text-ink-dim'];
  if (pull.conflicted) return ['conflicted', 'border-warn-edge text-warn-edge'];
  return ['open', 'border-scope text-scope'];
}

function Dot() {
  return (
    <span aria-hidden className="shrink-0 opacity-40">
      ·
    </span>
  );
}
