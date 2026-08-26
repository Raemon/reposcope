'use client';

import { usePathname } from 'next/navigation';
import type { PullRequestSummary } from './pullRequests';
import { LIST_NOTE, PullListRow, PullRowFields } from './PullListRow';
import { useStandingRepoPulls } from './pullActionStore';
import { pullRoute, repoPullsPath } from './pullPaths';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export function PullRequestList({ repo }: { repo: RepoRef }) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const pathname = usePathname();
  const { data: pulls, error } = useCachedJson<PullRequestSummary[]>(repoPullsPath(repo.owner, repo.name), token, ready);
  const standingPulls = useStandingRepoPulls(repo.owner, repo.name, pulls);

  if (!pulls) {
    if (error) return <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>;
    return <p className={`${LIST_NOTE} text-ink-dim`}>Loading…</p>;
  }
  if (standingPulls.length === 0) return <p className={`${LIST_NOTE} text-ink-dim`}>No open pull requests.</p>;

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>}
      {standingPulls.map((pull) => {
        const href = pullRoute(repo.owner, repo.name, pull.number);
        return (
          <PullListRow
            key={pull.number}
            target={{ owner: repo.owner, repo: repo.name, number: pull.number }}
            href={href}
            current={pathname === href}
          >
            <PullRowFields pull={pull} />
          </PullListRow>
        );
      })}
    </nav>
  );
}
