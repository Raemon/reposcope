'use client';

import { AllPullRequestList } from './AllPullRequestList';
import { PullFilterMenu } from './PullFilterMenu';
import { ALL_PULLS_ROWS, usePullFilters } from './pullFilterStore';
import { RepoFilesBrowser } from './RepoFilesBrowser';

export function AllPullsSurface() {
  const { author } = usePullFilters();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-panel-edge bg-panel px-3 py-1">
        <h1 className="shrink-0 text-[11px] leading-4 text-accent">All pull requests</h1>
        <p className="min-w-0 flex-1 truncate text-[10px] text-ink-dim">
          {ALL_PULLS_ROWS[author].note}, past week first
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
