'use client';

import type { ReactNode } from 'react';
import { ChangeCounts } from './ChangeCounts';
import type { PreviewToken } from './ColumnPreview';
import { useColumnNav, type ColumnRow } from './columnNav';
import type { ChangeSummary } from './pullRequests';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 px-1.5 py-[1px] text-left text-[11px] leading-4';
export const WHOLE_CHANGE = 'all';

export function PullCommitColumn({
  change,
  selection,
  onSelect,
}: {
  change: ChangeSummary;
  selection: string;
  onSelect: (selection: string) => void;
}) {
  const nav = useColumnNav('commits');
  const rowFor = (item: string) => nav.row(item, item === selection);
  return (
    <>
      <CommitRow row={rowFor(WHOLE_CHANGE)} onActivate={() => onSelect(WHOLE_CHANGE)}>
        <span className="min-w-0 flex-1 truncate">all changes</span>
        <ChangeCounts additions={change.additions} deletions={change.deletions} />
      </CommitRow>
      {change.commits.map((commit) => (
        <CommitRow key={commit.sha} row={rowFor(commit.sha)} onActivate={() => onSelect(commit.sha)}>
          <span className="shrink-0 text-[9px] text-ink-dim/50">{commit.sha.slice(0, 7)}</span>
          <span className="min-w-0 flex-1 truncate">{commit.message}</span>
          <span className="shrink-0 text-[9px] text-ink-dim">{commit.fileCount}f</span>
          <ChangeCounts additions={commit.additions} deletions={commit.deletions} />
          <RelativeTime iso={commit.date} className="shrink-0 text-[9px] text-ink-dim" />
        </CommitRow>
      ))}
    </>
  );
}

function CommitRow({
  row,
  onActivate,
  children,
}: {
  row: ColumnRow;
  onActivate: () => void;
  children: ReactNode;
}) {
  return (
    <SelectableRow {...row.props} onActivate={onActivate} className={`${ROW} ${rowStateClass(row.state)}`}>
      {children}
    </SelectableRow>
  );
}

export function commitItems(change: ChangeSummary): string[] {
  return [WHOLE_CHANGE, ...change.commits.map((commit) => commit.sha)];
}

export function commitTokens(change: ChangeSummary, selection: string): PreviewToken[] {
  return [
    { key: WHOLE_CHANGE, label: '∀', title: 'all changes', accent: selection === WHOLE_CHANGE },
    ...change.commits.map((commit) => ({
      key: commit.sha,
      label: commit.sha.slice(0, 2),
      title: `${commit.sha.slice(0, 7)} · ${commit.message}`,
      accent: commit.sha === selection,
    })),
  ];
}
