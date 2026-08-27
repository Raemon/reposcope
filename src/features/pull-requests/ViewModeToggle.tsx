'use client';

import type { ReactNode } from 'react';
import { setViewMode, useViewMode } from './viewModeStore';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function ViewModeToggle() {
  const mode = useViewMode();
  const next = mode === 'central' ? 'columns' : 'central';
  return (
    <HoverCardTrigger label={`Switch to ${next} layout`} className="shrink-0" focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={() => setViewMode(next)}
        aria-label={`Switch to ${next} layout`}
        className="rounded text-ink-dim hover:bg-btn-hover hover:text-ink"
      >
        {mode === 'central' ? <ColumnsIcon /> : <CentralIcon />}
      </button>
    </HoverCardTrigger>
  );
}

function ColumnsIcon() {
  return (
    <ToggleIcon>
      <rect x="2" y="4" width="5" height="16" rx="1" />
      <rect x="9.5" y="4" width="5" height="16" rx="1" />
      <rect x="17" y="4" width="5" height="16" rx="1" />
    </ToggleIcon>
  );
}

function CentralIcon() {
  return (
    <ToggleIcon>
      <rect x="6" y="4" width="12" height="16" rx="1" />
      <path d="M6 8.5h12" />
    </ToggleIcon>
  );
}

function ToggleIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {children}
    </svg>
  );
}
