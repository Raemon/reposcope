'use client';

import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export const COMMENT_ACTION =
  'rounded px-1 leading-4 text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-dim';

export function AuthorPortrait({ avatarUrl }: { avatarUrl: string }) {
  if (!avatarUrl) return <span className="h-3 w-3 shrink-0 rounded-full bg-btn" />;
  return <img src={avatarUrl} alt="" width={12} height={12} className="h-3 w-3 shrink-0 rounded-full" />;
}

export function OpenOnGithub({ url, className = '' }: { url?: string; className?: string }) {
  if (!url) return null;
  return (
    <HoverCardTrigger label="Open on GitHub" focusable={false} tooltipStyle className={className}>
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open on GitHub" className={COMMENT_ACTION}>
        ↗
      </a>
    </HoverCardTrigger>
  );
}
