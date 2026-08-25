'use client';

import type { ReactNode } from 'react';
import { AllPullRequestList } from './AllPullRequestList';
import { PullRequestList } from './PullRequestMenu';

export function AllPullsSurface() {
  return (
    <PullsSurface heading="All pull requests" note="open across every codebase you follow, past week first">
      <AllPullRequestList />
    </PullsSurface>
  );
}

export function RepoPullsSurface({ owner, repo }: { owner: string; repo: string }) {
  return (
    <PullsSurface heading={`${owner}/${repo}`} note="open pull requests, most recently updated first">
      <PullRequestList repo={{ owner, name: repo }} />
    </PullsSurface>
  );
}

function PullsSurface({ heading, note, children }: { heading: string; note: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 border-b border-panel-edge bg-panel px-3 py-1">
        <h1 className="text-[11px] leading-4 text-accent">{heading}</h1>
        <p className="text-[10px] text-ink-dim">{note}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
