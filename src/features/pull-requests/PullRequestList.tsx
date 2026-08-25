'use client';

import { usePathname } from 'next/navigation';
import type { PullRequestSummary } from './pullRequests';
import { PullListRow } from './PullListRow';
import { useStandingRepoPulls } from './pullActionStore';
import { pullRoute, repoPullsPath } from './pullPaths';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { timeAgo } from '@/features/surface-ui/timeAgo';

export function PullRequestList({ repo }: { repo: RepoRef }) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const pathname = usePathname();
  const { data: pulls, error } = useCachedJson<PullRequestSummary[]>(repoPullsPath(repo.owner, repo.name), token, ready);
  const standingPulls = useStandingRepoPulls(repo.owner, repo.name, pulls);

  if (!pulls) {
    if (error) return <p className="px-2 py-1 text-[11px] leading-4 text-error-ink">{error}</p>;
    return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">Loading…</p>;
  }
  if (standingPulls.length === 0) return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">No open pull requests.</p>;

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className="px-2 py-1 text-[11px] leading-4 text-error-ink">{error}</p>}
      {standingPulls.map((pull) => {
        const href = pullRoute(repo.owner, repo.name, pull.number);
        return (
          <PullListRow
            key={pull.number}
            target={{ owner: repo.owner, repo: repo.name, number: pull.number }}
            href={href}
            current={pathname === href}
          >
            <span className="shrink-0 font-mono text-[9px] text-ink-dim">#{pull.number}</span>
            <span className="min-w-0 flex-1 break-words">{pull.title}</span>
            {pull.draft && <span className="shrink-0 rounded bg-btn px-1 text-[9px]">draft</span>}
            <span className="shrink-0 font-mono text-[9px] text-ink-dim">
              {pull.author} · {timeAgo(pull.updatedAt)}
            </span>
          </PullListRow>
        );
      })}
    </nav>
  );
}
