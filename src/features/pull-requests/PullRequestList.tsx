'use client';

import { usePathname } from 'next/navigation';
import { LIST_NOTE, NO_PULLS, PullListRow, PullRowFields } from './PullListRow';
import { pullRoute } from './pullPaths';
import { useRepoPullList } from './usePullLists';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export function PullRequestList({ repo }: { repo: RepoRef }) {
  const pathname = usePathname();
  const { pulls, listed, error } = useRepoPullList(repo.owner, repo.name);

  if (!pulls) {
    if (error) return <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>;
    return <p className={`${LIST_NOTE} text-ink-dim`}>Loading…</p>;
  }
  if (listed.length === 0) return <p className={`${LIST_NOTE} text-ink-dim`}>{NO_PULLS}</p>;

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>}
      {listed.map((pull) => {
        const href = pullRoute(repo.owner, repo.name, pull.number);
        return (
          <PullListRow
            key={pull.number}
            target={{ owner: repo.owner, repo: repo.name, number: pull.number }}
            href={href}
            current={pathname === href}
            closable={pull.state === 'open'}
          >
            <PullRowFields pull={pull} />
          </PullListRow>
        );
      })}
    </nav>
  );
}
