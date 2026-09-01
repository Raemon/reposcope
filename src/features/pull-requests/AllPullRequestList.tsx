'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useColumnNav } from './columnNav';
import { LIST_NOTE as NOTE, NO_PULLS, PullListRow, PullRowFields } from './PullListRow';
import type { PullAttention } from './pullAttention';
import { allPullsRoute, pullRoute } from './pullPaths';
import type { CrossRepoPull } from './pullRequests';
import { useAllPullList } from './usePullLists';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function updatedWithinLastWeek(pull: CrossRepoPull): boolean {
  return Date.now() - Date.parse(pull.updatedAt) < WEEK_MS;
}

interface AttentionRow {
  pull: CrossRepoPull;
  attention: PullAttention;
}

function staysVisible({ pull, attention }: AttentionRow, pathname: string, cursor: string | null): boolean {
  const route = pullRoute(pull.owner, pull.repo, pull.number);
  return attention === 'review' || updatedWithinLastWeek(pull) || pathname === route || cursor === route;
}

function widestRepoName(rows: AttentionRow[]): number {
  return rows.reduce((widest, { pull }) => Math.max(widest, pull.repo.length), 0);
}

export function AllPullRequestList() {
  const { scanning, repoCount, found, error, listed, attentionOf, state } = useAllPullList();
  const pathname = usePathname();
  const { cursor } = useColumnNav('pulls');
  const [showingOlder, setShowingOlder] = useState(false);

  if (!found) {
    if (error) return <p className={`${NOTE} text-error-ink`}>{error}</p>;
    return (
      <p className={`${NOTE} text-ink-dim`}>
        {repoCount === 0 && !scanning ? 'No repositories yet.' : `Reading ${repoCount || ''} repositories…`}
      </p>
    );
  }

  const recentOnly = state === 'open' && !showingOlder;
  const rows = listed.map((pull) => ({ pull, attention: attentionOf(pull) }));
  const visible = rows.filter((row) => !recentOnly || staysVisible(row, pathname, cursor));
  const olderCount = rows.length - visible.length;
  const repoColumnCh = widestRepoName(visible);

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className={`${NOTE} text-error-ink`}>{error}</p>}
      {scanning && !error && <p className={`${NOTE} text-ink-dim`}>Reading more repositories…</p>}
      {listed.length === 0 && <p className={`${NOTE} text-ink-dim`}>{NO_PULLS}</p>}
      {visible.map((row) => (
        <PullRow
          key={`${row.pull.owner}/${row.pull.repo}#${row.pull.number}`}
          row={row}
          pathname={pathname}
          repoColumnCh={repoColumnCh}
        />
      ))}
      {olderCount > 0 && (
        <button
          type="button"
          onClick={() => setShowingOlder(true)}
          className="w-full px-2 py-[1px] text-left text-[11px] leading-4 text-ink-dim hover:bg-btn-hover hover:text-ink"
        >
          show older ({olderCount})
        </button>
      )}
      {found.failures.map((failure) => (
        <p key={failure.repo} className={`${NOTE} text-ink-dim`}>
          {failure.repo}: {failure.message}
        </p>
      ))}
    </nav>
  );
}

function PullRow({
  row: { pull, attention },
  pathname,
  repoColumnCh,
}: {
  row: AttentionRow;
  pathname: string;
  repoColumnCh: number;
}) {
  return (
    <PullListRow
      target={{ owner: pull.owner, repo: pull.repo, number: pull.number }}
      href={allPullsRoute(pull.owner, pull.repo, pull.number)}
      current={pathname === pullRoute(pull.owner, pull.repo, pull.number)}
      closable={pull.state === 'open'}
      column="all-pulls"
    >
      <PullRowFields pull={pull} attention={attention} repo={pull.repo} repoColumnCh={repoColumnCh} />
    </PullListRow>
  );
}
