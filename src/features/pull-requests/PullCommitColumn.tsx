'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChangeCounts } from './ChangeCounts';
import type { PreviewToken } from './ColumnPreview';
import { useColumnNav, type ColumnRow } from './columnNav';
import { ROW_META, stackedMetaClass } from './PullListRow';
import type { CommitSummary, PullRequestCommits } from './pullRequests';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';
import { useWrappedText } from '@/features/surface-ui/useWrappedText';

const ROW = 'flex w-full items-center gap-1.5 px-1.5 py-1 text-left font-serif text-[12px] leading-[1.15]';
const HASH = 'ml-1.5 w-[3ch] shrink-0 font-mono text-[9px]';
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
      <CommitRow row={rowFor(WHOLE_PULL)} onActivate={() => onSelect(WHOLE_PULL)} leading={<span aria-hidden className={HASH} />}>
        <span className="min-w-0 flex-1">all changes</span>
        <ChangeCounts additions={pull.additions} deletions={pull.deletions} />
      </CommitRow>
      {pull.commits.map((commit) => (
        <CommitEntry key={commit.sha} commit={commit} row={rowFor(commit.sha)} onActivate={() => onSelect(commit.sha)} />
      ))}
    </>
  );
}

function CommitEntry({ commit, row, onActivate }: { commit: CommitSummary; row: ColumnRow; onActivate: () => void }) {
  const [message, wrapped] = useWrappedText<HTMLSpanElement>();
  return (
    <CommitRow row={row} onActivate={onActivate} leading={<CopyHash sha={commit.sha} />}>
      <span className="min-w-0 flex-1 break-words">
        <span ref={message}>{commit.message}</span>
      </span>
      <span className={stackedMetaClass(wrapped)}>
        <span className={ROW_META}>{commit.fileCount}f</span>
        <ChangeCounts additions={commit.additions} deletions={commit.deletions} />
        <RelativeTime iso={commit.date} className={ROW_META} />
      </span>
    </CommitRow>
  );
}

function CommitRow({
  row,
  onActivate,
  leading,
  children,
}: {
  row: ColumnRow;
  onActivate: () => void;
  leading: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`flex items-center border-b border-ink/15 ${rowStateClass(row.state)}`}
    >
      {leading}
      <SelectableRow {...row.props} onActivate={onActivate} className={ROW}>
        {children}
      </SelectableRow>
    </div>
  );
}

function useCopiedFlag(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [
    copied,
    () => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    },
  ];
}

function CopyHash({ sha }: { sha: string }) {
  const [copied, markCopied] = useCopiedFlag();
  const copy = () => void navigator.clipboard?.writeText(sha).then(markCopied, () => {});
  return (
    <HoverCardTrigger label={copied ? `copied ${sha}` : `copy ${sha}`} className="shrink-0" focusable={false} tooltipStyle>
      <button
        type="button"
        aria-label={`Copy commit hash ${sha}`}
        onClick={copy}
        className={`${HASH} text-left hover:text-accent ${copied ? 'text-accent' : 'text-ink-dim/50'}`}
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
