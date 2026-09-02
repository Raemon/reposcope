'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentRowInView } from './NavListRow';
import { LIST_NOTE, NO_PULLS, PullListRow, PullRowFields } from './PullListRow';
import { clearPullFilters, isDefaultPullFilters, usePullFilters } from './pullFilterStore';
import { pullRoute } from './pullPaths';
import { useRepoPullList } from './usePullLists';
import { repoRoute } from '@/features/codebases/repoPaths';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export function PullRequestList({ repo }: { repo: RepoRef }) {
  const pathname = usePathname();
  const { pulls, listed, error } = useRepoPullList(repo.owner, repo.name);
  const list = useCurrentRowInView(listed.length);

  if (!pulls) {
    if (error) return <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>;
    return <p className={`${LIST_NOTE} text-ink-dim`}>Loading…</p>;
  }

  return (
    <nav ref={list} className="flex min-h-full flex-1 flex-col overflow-auto py-[1px]">
      {error && <p className={`${LIST_NOTE} text-error-ink`}>{error}</p>}
      {listed.length === 0 && <NoMatchingPulls />}
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
            <PullRowFields pull={pull} />
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

export function NoMatchingPulls() {
  const filters = usePullFilters();
  return (
    <p className={`${LIST_NOTE} text-ink-dim`}>
      {NO_PULLS}
      {!isDefaultPullFilters(filters) && <ClearFiltersButton />}
    </p>
  );
}

function ClearFiltersButton() {
  return (
    <button type="button" onClick={clearPullFilters} className="ml-1 underline decoration-dotted hover:text-ink">
      clear filters
    </button>
  );
}
