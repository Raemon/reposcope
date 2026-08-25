'use client';

import { useState, type ReactNode } from 'react';
import { ChangeCounts } from './ChangeCounts';
import type { PreviewToken } from './ColumnPreview';
import { useColumnNav, type ColumnRow } from './columnNav';
import type { PullRequestCommits } from './pullRequests';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-center gap-1.5 py-[2px] pr-1.5 text-left font-serif text-[12px] leading-[1.15]';
const META = 'shrink-0 font-mono text-[9px]';
const HASH_CHARS = 3;
const COPIED_MS = 1200;
export const WHOLE_PULL = 'all';

export function PullCommitColumn({
  pull,
  selection,
  onSelect,
}: {
  pull: PullRequestCommits;
  selection: string;
  onSelect: (selection: string) => void;
}) {
  const nav = useColumnNav('commits');
  const rowFor = (item: string) => nav.row(item, item === selection);
  return (
    <>
      <CommitRow row={rowFor(WHOLE_PULL)} onActivate={() => onSelect(WHOLE_PULL)}>
        <span className="min-w-0 flex-1">all changes</span>
        <ChangeCounts additions={pull.additions} deletions={pull.deletions} />
      </CommitRow>
      {pull.commits.map((commit) => (
        <CommitRow key={commit.sha} row={rowFor(commit.sha)} onActivate={() => onSelect(commit.sha)} sha={commit.sha}>
          <span className="min-w-0 flex-1 break-words">{commit.message}</span>
          <span className={`${META} text-ink-dim`}>{commit.fileCount}f</span>
          <ChangeCounts additions={commit.additions} deletions={commit.deletions} />
          <RelativeTime iso={commit.date} className={`${META} text-ink-dim`} />
        </CommitRow>
      ))}
    </>
  );
}

function CommitRow({
  row,
  onActivate,
  sha,
  children,
}: {
  row: ColumnRow;
  onActivate: () => void;
  sha?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-center ${rowStateClass(row.state)}`}>
      {sha ? <CopyHash sha={sha} /> : <span className={`${META} pl-1.5`}>{' '.repeat(HASH_CHARS)}</span>}
      <SelectableRow {...row.props} onActivate={onActivate} className={ROW}>
        {children}
      </SelectableRow>
    </div>
  );
}

function CopyHash({ sha }: { sha: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(sha);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  };
  return (
    <HoverCardTrigger label={copied ? `copied ${sha}` : `copy ${sha}`} className="shrink-0" focusable={false} tooltipStyle>
      <button
        type="button"
        aria-label={`Copy commit hash ${sha}`}
        onClick={copy}
        className={`${META} pl-1.5 hover:text-accent ${copied ? 'text-accent' : 'text-ink-dim/50'}`}
      >
        {sha.slice(0, HASH_CHARS)}
      </button>
    </HoverCardTrigger>
  );
}

export function commitItems(pull: PullRequestCommits): string[] {
  return [WHOLE_PULL, ...pull.commits.map((commit) => commit.sha)];
}

export function commitTokens(pull: PullRequestCommits, selection: string): PreviewToken[] {
  return [
    { key: WHOLE_PULL, label: '∀', title: 'all changes', accent: selection === WHOLE_PULL },
    ...pull.commits.map((commit) => ({
      key: commit.sha,
      label: commit.sha.slice(0, 2),
      title: `${commit.sha.slice(0, 7)} · ${commit.message}`,
      accent: commit.sha === selection,
    })),
  ];
}
