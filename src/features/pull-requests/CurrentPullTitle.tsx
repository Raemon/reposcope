'use client';

import { useCurrentPull } from './currentPullStore';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export function CurrentPullTitle({ repo, number }: { repo: RepoRef; number: number }) {
  const pull = useCurrentPull(repo.owner, repo.name, number);
  return (
    <div className="flex min-w-0 flex-1 items-baseline gap-1.5 text-[11px] leading-4">
      <span className="shrink-0 text-accent">#{number}</span>
      {pull && (
        <>
          <span className="min-w-0 truncate text-ink">{pull.pull.title}</span>
          <span className="shrink-0 text-[9px] text-ink-dim">
            {pull.pull.author} · {pull.headRef} → {pull.baseRef} · {timeAgo(pull.pull.updatedAt)}
          </span>
        </>
      )}
    </div>
  );
}
