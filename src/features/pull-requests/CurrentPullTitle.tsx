'use client';

import { useCurrentPull } from './currentPullStore';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export function CurrentPullTitle({ repo, number }: { repo: RepoRef; number: number }) {
  const pull = useCurrentPull(repo.owner, repo.name, number);
  return (
    <div className="flex min-w-0 flex-1 items-baseline gap-2 text-[13px] leading-5">
      <span className="shrink-0 text-accent">#{number}</span>
      {pull && (
        <>
          <span className="min-w-0 truncate text-ink">{pull.pull.title}</span>
          <span className="shrink-0 pl-3 text-[10px] text-ink-dim/70">
            {pull.pull.author} · {pull.headRef} → {pull.baseRef} · {timeAgo(pull.pull.updatedAt)}
          </span>
        </>
      )}
    </div>
  );
}
