'use client';

import { useCurrentPull } from './currentPullStore';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function PreviewLink({ repo, number }: { repo: RepoRef; number: number }) {
  const pull = useCurrentPull(repo.owner, repo.name, number);
  const previewUrl = pull?.previewUrl ?? null;
  if (previewUrl === null) return null;
  return (
    <HoverCardTrigger label={`Open the preview deployment for #${number} in a new tab`} focusable={false} tooltipStyle>
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer"
        className="block shrink-0 rounded bg-btn px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink"
      >
        Preview
      </a>
    </HoverCardTrigger>
  );
}
