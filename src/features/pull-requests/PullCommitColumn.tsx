'use client';

import { ChangeCounts } from './ChangeCounts';
import type { PullRequestCommits } from './pullRequests';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 px-1.5 py-[1px] text-left text-[11px] leading-4';
const WHOLE_PULL = 'all';

export function PullCommitColumn({
  pull,
  selection,
  onSelect,
}: {
  pull: PullRequestCommits;
  selection: string;
  onSelect: (selection: string) => void;
}) {
  return (
    <>
      <SelectableRow
        onActivate={() => onSelect(WHOLE_PULL)}
        className={`${ROW} ${selection === WHOLE_PULL ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
      >
        <span className="min-w-0 flex-1 truncate">all changes</span>
        <ChangeCounts additions={pull.additions} deletions={pull.deletions} />
      </SelectableRow>
      {pull.commits.map((commit) => (
        <SelectableRow
          key={commit.sha}
          onActivate={() => onSelect(commit.sha)}
          className={`${ROW} ${commit.sha === selection ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
        >
          <span className="shrink-0 text-[9px] text-ink-dim/50">{commit.sha.slice(0, 7)}</span>
          <span className="min-w-0 flex-1 truncate">{commit.message}</span>
          <span className="shrink-0 text-[9px] text-ink-dim">{commit.fileCount}f</span>
          <ChangeCounts additions={commit.additions} deletions={commit.deletions} />
          <RelativeTime iso={commit.date} className="shrink-0 text-[9px] text-ink-dim" />
        </SelectableRow>
      ))}
    </>
  );
}
