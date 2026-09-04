'use client';

import type { ReactNode } from 'react';
import { HoverCardTrigger } from './HoverCard';

export function FailureNote({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <HoverCardTrigger label={label} className="max-w-56" focusable={false} tooltipStyle>
      <span className="max-w-40 truncate text-[10px] text-error-ink">{children ?? label}</span>
    </HoverCardTrigger>
  );
}
