'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useColumnNav } from './columnNav';
import { LIST_NOTE as NOTE, PullListRow, PullRowFields, ROW_META } from './PullListRow';
import { useStandingPulls } from './pullActionStore';
import { allPullsRoute, pullRoute } from './pullPaths';
import type { CrossRepoPull } from './pullRequests';
import { useAllPullRequests } from './useAllPullRequests';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function updatedWithinLastWeek(pull: CrossRepoPull): boolean {
  return Date.now() - Date.parse(pull.updatedAt) < WEEK_MS;
}

function widestRepoName(pulls: CrossRepoPull[]): number {
  return pulls.reduce((widest, pull) => Math.max(widest, pull.repo.length), 0);
}

export function AllPullRequestList() {
  const { scanning, repoCount, found, error } = useAllPullRequests();
  const pathname = usePathname();
  const standingPulls = useStandingPulls(found?.pulls);
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

  const visible = standingPulls.filter((pull) => {
    const route = pullRoute(pull.owner, pull.repo, pull.number);
    return showingOlder || updatedWithinLastWeek(pull) || pathname === route || cursor === route;
  });
  const olderCount = standingPulls.length - visible.length;
  const repoColumnCh = widestRepoName(visible);

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className={`${NOTE} text-error-ink`}>{error}</p>}
      {scanning && !error && <p className={`${NOTE} text-ink-dim`}>Reading more repositories…</p>}
      {standingPulls.length === 0 && <p className={`${NOTE} text-ink-dim`}>No open pull requests.</p>}
      {visible.map((pull) => (
        <PullRow
          key={`${pull.owner}/${pull.repo}#${pull.number}`}
          pull={pull}
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
  pull,
  pathname,
  repoColumnCh,
}: {
  pull: CrossRepoPull;
  pathname: string;
  repoColumnCh: number;
}) {
  return (
    <PullListRow
      target={{ owner: pull.owner, repo: pull.repo, number: pull.number }}
      href={allPullsRoute(pull.owner, pull.repo, pull.number)}
      current={pathname === pullRoute(pull.owner, pull.repo, pull.number)}
    >
      <span className={`${ROW_META} truncate`} style={{ width: `${repoColumnCh}ch` }}>
        {pull.repo}
      </span>
      <PullRowFields pull={pull} />
    </PullListRow>
  );
}
