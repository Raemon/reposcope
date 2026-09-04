'use client';

import type { ReactNode } from 'react';
import { iconButtonClass } from './buttonStyles';
import { HoverCardTrigger } from './HoverCard';

export function IconToggleButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <HoverCardTrigger label={label} className="shrink-0" focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`${iconButtonClass(false)} hover:bg-btn-hover`}
      >
        {children}
      </button>
    </HoverCardTrigger>
  );
}
