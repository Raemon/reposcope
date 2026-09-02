'use client';

import { HoverCardTrigger } from './HoverCard';

export function OpenOnGithubLink({ href, label, className = '' }: { href: string; label: string; className?: string }) {
  return (
    <HoverCardTrigger label="Open on GitHub" className="shrink-0" focusable={false} tooltipStyle>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} on GitHub`} className={className}>
        ↗
      </a>
    </HoverCardTrigger>
  );
}
