'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PullRequestSummary } from './pullRequests';
import { HeaderMenu } from '@/features/codebases/HeaderMenu';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
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
  const [pulls, setPulls] = useState<PullRequestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    apiJson<PullRequestSummary[]>(
      `/api/github/pulls?owner=${encodeURIComponent(repo.owner)}&name=${encodeURIComponent(repo.name)}`,
      token,
      controller.signal,
    )
      .then(setPulls)
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [repo.owner, repo.name, token, ready]);

  if (error) return <p className="px-2 py-1 text-[11px] leading-4 text-error-ink">{error}</p>;
  if (!pulls) return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">Loading…</p>;
  if (pulls.length === 0) return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">No open pull requests.</p>;

  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {pulls.map((pull) => {
        const href = `/repo/${repo.owner}/${repo.name}/pull/${pull.number}`;
        const active = pathname === href;
        return (
          <SelectableLink
            key={pull.number}
            href={href}
            title={pull.title}
            current={active}
            className={`flex items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4 ${
              active ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
            }`}
          >
            <span className="shrink-0 text-[9px] text-ink-dim">#{pull.number}</span>
            <span className="min-w-0 flex-1 truncate">{pull.title}</span>
            {pull.draft && <span className="shrink-0 rounded border border-btn-edge px-1 text-[9px]">draft</span>}
            <span className="shrink-0 text-[9px] text-ink-dim">
              {pull.author} · {timeAgo(pull.updatedAt)}
            </span>
          </SelectableLink>
        );
      })}
    </nav>
  );
}
