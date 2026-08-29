'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { closePull } from './closePull';
import { NavListRow } from './NavListRow';
import { collapsePullList, type PullListColumnName } from './collapsePullList';
import type { PullTarget } from './pullActionStore';
import { prefetchPull } from './prefetchPull';
import { pullRoute } from './pullPaths';
import { useIsOwnAuthor } from '@/features/github-auth/useViewerLogin';
import { useGithubToken } from '@/features/sources/sourceStore';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { opensAnotherTab } from '@/features/surface-ui/selectableClick';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { useWrappedText } from '@/features/surface-ui/useWrappedText';

interface PullRowSummary {
  number: number;
  title: string;
  draft: boolean;
  author: string;
  updatedAt: string;
  state: string;
  merged: boolean;
}

export const ROW_META = 'shrink-0 font-mono text-[9px] text-ink-dim';
export const LIST_NOTE = 'px-2 py-1 text-[11px] leading-4';
export const NO_PULLS = 'No matching pull requests.';

export function PullRowFields({ pull }: { pull: PullRowSummary }) {
  const [title, wrapped] = useWrappedText<HTMLSpanElement>();
  const isOwnAuthor = useIsOwnAuthor();
  return (
    <>
      <span className={ROW_META}>#{pull.number}</span>
      <span className="min-w-0 flex-1 break-words">
        <span ref={title}>{pull.title}</span>
      </span>
      {pull.draft && <RowTag>draft</RowTag>}
      {pull.state !== 'open' && <RowTag>{pull.merged ? 'merged' : 'closed'}</RowTag>}
      <span className={stackedMetaClass(wrapped)}>
        {!isOwnAuthor(pull.author) && (
          <span className={ROW_META}>
            {pull.author}
            {wrapped ? '' : ' ·'}
          </span>
        )}
        <RelativeTime iso={pull.updatedAt} className={ROW_META} />
      </span>
    </>
  );
}

function RowTag({ children }: { children: ReactNode }) {
  return <span className="shrink-0 rounded bg-btn px-1 font-mono text-[9px]">{children}</span>;
}

export function stackedMetaClass(wrapped: boolean): string {
  return `flex shrink-0 gap-x-1.5 ${wrapped ? 'flex-col items-end' : 'items-center'}`;
}

export function PullListRow({
  target,
  href,
  current,
  closable,
  column,
  children,
}: {
  target: PullTarget;
  href: string;
  current: boolean;
  closable: boolean;
  column: PullListColumnName;
  children: ReactNode;
}) {
  const token = useGithubToken();
  return (
    <NavListRow
      route={pullRoute(target.owner, target.repo, target.number)}
      href={href}
      current={current}
      serif
      onPointerEnter={() => prefetchPull(target.owner, target.repo, target.number, token)}
      onSelect={(event) => {
        if (!current && !opensAnotherTab(event)) collapsePullList(column);
      }}
      trailing={closable ? <ClosePullIcon target={target} token={token} shown={current} /> : null}
    >
      {children}
    </NavListRow>
  );
}

function ClosePullIcon({ target, token, shown }: { target: PullTarget; token: string | null; shown: boolean }) {
  const router = useRouter();
  return (
    <HoverCardTrigger label={`Close #${target.number}`} className={`shrink-0 focus-within:opacity-100 group-hover:opacity-100 ${shown ? '' : 'opacity-0'}`} focusable={false} tooltipStyle>
      <button
        type="button"
        aria-label={`Close pull request #${target.number}`}
        onClick={() => closePull(target, token, (href) => router.push(href))}
        className="px-1.5 text-[11px] leading-4 text-ink-dim hover:text-ink"
      >
        ×
      </button>
    </HoverCardTrigger>
  );
}
