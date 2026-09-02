'use client';

import { useCurrentPull } from './currentPullStore';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { CHOICE } from '@/features/surface-ui/buttonStyles';
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
        rel="noopener noreferrer"
        className={`${CHOICE} block shrink-0`}
      >
        Preview
      </a>
    </HoverCardTrigger>
  );
}
