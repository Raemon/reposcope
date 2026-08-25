'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useColumnNav } from './columnNav';
import { useStandingPulls } from './mergeStore';
import { prefetchPull } from './prefetchPull';
import { allPullsRoute, pullRoute } from './pullPaths';
import type { CrossRepoPull } from './pullRequests';
import { useAllPullRequests } from './useAllPullRequests';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import { useGithubToken } from '@/features/sources/sourceStore';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

const NOTE = 'px-2 py-1 text-[11px] leading-4';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function updatedWithinLastWeek(pull: CrossRepoPull): boolean {
  return Date.now() - Date.parse(pull.updatedAt) < WEEK_MS;
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

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className={`${NOTE} text-error-ink`}>{error}</p>}
      {scanning && !error && <p className={`${NOTE} text-ink-dim`}>Reading more repositories…</p>}
      {standingPulls.length === 0 && <p className={`${NOTE} text-ink-dim`}>No open pull requests.</p>}
      {visible.map((pull) => (
        <PullRow key={`${pull.owner}/${pull.repo}#${pull.number}`} pull={pull} pathname={pathname} />
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

function PullRow({ pull, pathname }: { pull: CrossRepoPull; pathname: string }) {
  const token = useGithubToken();
  const route = pullRoute(pull.owner, pull.repo, pull.number);
  const active = pathname === route;
  const row = useColumnNav('pulls').row(route, active);
  return (
    <SelectableLink
      {...row.props}
      href={allPullsRoute(pull.owner, pull.repo, pull.number)}
      title={`${pull.owner}/${pull.repo} #${pull.number} — ${pull.title}`}
      current={active}
      onPointerEnter={() => {
        row.props.onPointerEnter();
        prefetchPull(pull.owner, pull.repo, pull.number, token);
      }}
      className={`flex items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4 ${rowStateClass(row.state)}`}
    >
      <span className="max-w-[9rem] shrink-0 truncate text-[9px] text-ink-dim">{pull.repo}</span>
      <span className="shrink-0 text-[9px] text-ink-dim">#{pull.number}</span>
      <span className="min-w-0 flex-1 truncate">{pull.title}</span>
      {pull.draft && <span className="shrink-0 rounded bg-btn px-1 text-[9px]">draft</span>}
      <span className="shrink-0 text-[9px] text-ink-dim">
        {pull.author} · {timeAgo(pull.updatedAt)}
      </span>
    </SelectableLink>
  );
}
