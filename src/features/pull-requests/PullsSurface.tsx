'use client';

import { AllPullRequestList } from './AllPullRequestList';
import { PullFilterMenu } from './PullFilterMenu';
import { usePullFilters, type PullAuthor } from './pullFilterStore';
import { RepoFilesBrowser } from './RepoFilesBrowser';

const AUTHOR_NOTES: Record<PullAuthor, string> = {
  mine: 'only yours, across every codebase you follow, past week first',
  anyone: 'by anyone, across every codebase you follow, past week first',
};

export function AllPullsSurface() {
  const { author } = usePullFilters();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-panel-edge bg-panel px-3 py-1">
        <h1 className="shrink-0 text-[11px] leading-4 text-accent">All pull requests</h1>
        <p className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">
          {AUTHOR_NOTES[author]}
        </p>
        <PullFilterMenu />
      </div>
      <AllPullRequestList />
    </div>
  );
}

export function RepoPullsSurface({ owner, repo }: { owner: string; repo: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <RepoFilesBrowser owner={owner} repo={repo} />
    </div>
  );
}
