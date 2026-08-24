'use client';

import { AllPullRequestList } from './AllPullRequestList';

export function AllPullsSurface() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 border-b border-panel-edge bg-panel px-3 py-1">
        <h1 className="text-[11px] leading-4 text-accent">All pull requests</h1>
        <p className="text-[10px] text-ink-dim">open across every codebase you follow, newest first</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <AllPullRequestList />
      </div>
    </div>
  );
}
