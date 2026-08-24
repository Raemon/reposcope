'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CrossRepoPull } from './pullRequests';
import { useAllPullRequests } from './useAllPullRequests';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';

const NOTE = 'px-2 py-1 text-[11px] leading-4';

export function allPullHref(pull: { owner: string; repo: string; number: number }): string {
  return `/repo/${pull.owner}/${pull.repo}/pull/${pull.number}?from=all`;
}

export function AllPullRequestList() {
  const { scanning, repoCount, found, error } = useAllPullRequests();
  const pathname = usePathname();

  if (error) return <p className={`${NOTE} text-error-ink`}>{error}</p>;
  if (!found) {
    return (
      <p className={`${NOTE} text-ink-dim`}>
        {repoCount === 0 && !scanning ? 'No repositories yet.' : `Reading ${repoCount || ''} repositories…`}
      </p>
    );
  }

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {scanning && <p className={`${NOTE} text-ink-dim`}>Reading more repositories…</p>}
      {found.pulls.length === 0 && <p className={`${NOTE} text-ink-dim`}>No open pull requests.</p>}
      {found.pulls.map((pull) => (
        <PullRow key={`${pull.owner}/${pull.repo}#${pull.number}`} pull={pull} pathname={pathname} />
      ))}
      {found.failures.map((failure) => (
        <p key={failure.repo} className={`${NOTE} text-ink-dim`}>
          {failure.repo}: {failure.message}
        </p>
      ))}
    </nav>
  );
}

function PullRow({ pull, pathname }: { pull: CrossRepoPull; pathname: string }) {
  const href = allPullHref(pull);
  const active = pathname === href.split('?')[0];
  return (
    <Link
      href={href}
      title={`${pull.owner}/${pull.repo} #${pull.number} — ${pull.title}`}
      className={`flex items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4 ${
        active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
      }`}
    >
      <span className="max-w-[9rem] shrink-0 truncate text-[9px] text-ink-dim">{pull.repo}</span>
      <span className="shrink-0 text-[9px] text-ink-dim">#{pull.number}</span>
      <span className="min-w-0 flex-1 truncate">{pull.title}</span>
      {pull.draft && <span className="shrink-0 rounded border border-btn-edge px-1 text-[9px]">draft</span>}
      <span className="shrink-0 text-[9px] text-ink-dim">
        {pull.author} · {timeAgo(pull.updatedAt)}
      </span>
    </Link>
  );
}
