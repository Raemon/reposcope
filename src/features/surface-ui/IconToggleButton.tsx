'use client';

import type { ReactNode } from 'react';
import { HoverCardTrigger } from './HoverCard';

export function IconToggleButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <HoverCardTrigger label={label} className="shrink-0" focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="rounded text-ink-dim hover:bg-btn-hover hover:text-ink"
      >
        {children}
      </button>
    </HoverCardTrigger>
  );
}
