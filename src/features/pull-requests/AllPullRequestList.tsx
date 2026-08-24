'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { prefetchPull } from './prefetchPull';
import type { CrossRepoPull } from './pullRequests';
import { useAllPullRequests } from './useAllPullRequests';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import { useGithubToken } from '@/features/sources/sourceStore';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

const NOTE = 'px-2 py-1 text-[11px] leading-4';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function pullRoute(pull: { owner: string; repo: string; number: number }): string {
  return `/repo/${pull.owner}/${pull.repo}/pull/${pull.number}`;
}

export function allPullHref(pull: { owner: string; repo: string; number: number }): string {
  return `${pullRoute(pull)}?from=all`;
}

function updatedWithinLastWeek(pull: CrossRepoPull): boolean {
  return Date.now() - Date.parse(pull.updatedAt) < WEEK_MS;
}

export function AllPullRequestList() {
  const { scanning, repoCount, found, error } = useAllPullRequests();
  const pathname = usePathname();
  const [showingOlder, setShowingOlder] = useState(false);

  if (!found) {
    if (error) return <p className={`${NOTE} text-error-ink`}>{error}</p>;
    return (
      <p className={`${NOTE} text-ink-dim`}>
        {repoCount === 0 && !scanning ? 'No repositories yet.' : `Reading ${repoCount || ''} repositories…`}
      </p>
    );
  }

  const visible = found.pulls.filter(
    (pull) => showingOlder || updatedWithinLastWeek(pull) || pathname === pullRoute(pull),
  );
  const olderCount = found.pulls.length - visible.length;

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className={`${NOTE} text-error-ink`}>{error}</p>}
      {scanning && !error && <p className={`${NOTE} text-ink-dim`}>Reading more repositories…</p>}
      {found.pulls.length === 0 && <p className={`${NOTE} text-ink-dim`}>No open pull requests.</p>}
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
  const href = allPullHref(pull);
  const active = pathname === pullRoute(pull);
  return (
    <SelectableLink
      href={href}
      title={`${pull.owner}/${pull.repo} #${pull.number} — ${pull.title}`}
      current={active}
      onPointerEnter={() => prefetchPull(pull.owner, pull.repo, pull.number, token)}
      className={`flex items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4 ${
        active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
      }`}
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
