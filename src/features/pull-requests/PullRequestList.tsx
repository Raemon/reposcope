'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LIST_NOTE, NO_PULLS, PullListRow, PullRowFields } from './PullListRow';
import { pullRoute } from './pullPaths';
import { useRepoPullList } from './usePullLists';
import { repoRoute } from '@/features/codebases/repoPaths';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export function PullRequestList({ repo }: { repo: RepoRef }) {
  const pathname = usePathname();
  const { pulls, listed, attentionOf, error } = useRepoPullList(repo.owner, repo.name);

  if (!pulls) {
    if (error) return <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>;
    return <p className={`${LIST_NOTE} text-ink-dim`}>Loading…</p>;
  }

  return (
    <nav className="flex min-h-full flex-1 flex-col overflow-auto py-[1px]">
      {error && <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>}
      {listed.length === 0 && <p className={`${LIST_NOTE} text-ink-dim`}>{NO_PULLS}</p>}
      {listed.map((pull) => {
        const href = pullRoute(repo.owner, repo.name, pull.number);
        return (
          <PullListRow
            key={pull.number}
            target={{ owner: repo.owner, repo: repo.name, number: pull.number }}
            href={href}
            current={pathname === href}
            closable={pull.state === 'open'}
            column="pulls"
          >
            <PullRowFields pull={pull} attention={attentionOf(pull)} />
          </PullListRow>
        );
      })}
      <DefaultBranchSpace owner={repo.owner} repo={repo.name} />
    </nav>
  );
}

function DefaultBranchSpace({ owner, repo }: { owner: string; repo: string }) {
  return (
    <Link
      href={repoRoute(owner, repo)}
      aria-label="Show the default branch"
      className="min-h-6 flex-1 cursor-default"
    />
  );
}
