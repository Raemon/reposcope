'use client';

import { usePathname } from 'next/navigation';
import type { PullRequestSummary } from './pullRequests';
import { HeaderMenu } from '@/features/codebases/HeaderMenu';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import { useStandingRepoPulls } from './mergeStore';
import { pullRoute, repoPullsPath } from './pullPaths';
import { prefetchPull } from './prefetchPull';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

export function PullRequestMenu({ repo }: { repo: RepoRef }) {
  return (
    <HeaderMenu label="PRs" width="w-[26rem]">
      {() => <PullRequestList repo={repo} />}
    </HeaderMenu>
  );
}

export function PullRequestList({ repo }: { repo: RepoRef }) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const pathname = usePathname();
  const { data: pulls, error } = useCachedJson<PullRequestSummary[]>(repoPullsPath(repo.owner, repo.name), token, ready);
  const standingPulls = useStandingRepoPulls(repo.owner, repo.name, pulls);

  if (!pulls) {
    if (error) return <p className="px-2 py-1 text-[11px] leading-4 text-error-ink">{error}</p>;
    return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">Loading…</p>;
  }
  if (standingPulls.length === 0) return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">No open pull requests.</p>;

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {error && <p className="px-2 py-1 text-[11px] leading-4 text-error-ink">{error}</p>}
      {standingPulls.map((pull) => {
        const href = pullRoute(repo.owner, repo.name, pull.number);
        const active = pathname === href;
        return (
          <SelectableLink
            key={pull.number}
            href={href}
            title={pull.title}
            current={active}
            onPointerEnter={() => prefetchPull(repo.owner, repo.name, pull.number, token)}
            className={`flex items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4 ${
              active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
            }`}
          >
            <span className="shrink-0 text-[9px] text-ink-dim">#{pull.number}</span>
            <span className="min-w-0 flex-1 truncate">{pull.title}</span>
            {pull.draft && <span className="shrink-0 rounded bg-btn px-1 text-[9px]">draft</span>}
            <span className="shrink-0 text-[9px] text-ink-dim">
              {pull.author} · {timeAgo(pull.updatedAt)}
            </span>
          </SelectableLink>
        );
      })}
    </nav>
  );
}
