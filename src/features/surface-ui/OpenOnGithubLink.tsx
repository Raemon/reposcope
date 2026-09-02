'use client';

import { HoverCardTrigger } from './HoverCard';

export function OpenOnGithubLink({ href, what, className }: { href: string; what: string; className: string }) {
  return (
    <HoverCardTrigger label="Open on GitHub" focusable={false} tooltipStyle>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${what} on GitHub`}
        className={className}
      >
        ↗
      </a>
    </HoverCardTrigger>
  );
}
