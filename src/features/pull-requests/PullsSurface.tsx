'use client';

import type { ReactNode } from 'react';
import { AllPullRequestList } from './AllPullRequestList';
import { PullRequestList } from './PullRequestList';
import { usePullSort } from './pullSortStore';
import { RepoFilesBrowser } from './RepoFilesBrowser';

export function AllPullsSurface() {
  return (
    <PullsSurface heading="All pull requests" note={`across every codebase you follow, ${useSortNote()}`}>
      <AllPullRequestList />
    </PullsSurface>
  );
}

export function RepoPullsSurface({ owner, repo }: { owner: string; repo: string }) {
  return (
    <PullsSurface heading="Pull requests" note={`in this codebase, ${useSortNote()}`}>
      <RepoFilesBrowser owner={owner} repo={repo}>
        <PullRequestList repo={{ owner, name: repo }} />
      </RepoFilesBrowser>
    </PullsSurface>
  );
}

function useSortNote(): string {
  return usePullSort() === 'attention' ? 'the ones needing you first' : 'most recently updated first';
}

function PullsSurface({ heading, note, children }: { heading: string; note: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 border-b border-panel-edge bg-panel px-3 py-1">
        <h1 className="text-[11px] leading-4 text-accent">{heading}</h1>
        <p className="text-[10px] text-ink-dim">{note}</p>
      </div>
      {children}
    </div>
  );
}
