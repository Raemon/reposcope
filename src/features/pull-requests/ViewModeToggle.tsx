'use client';

import type { ReactNode } from 'react';
import { nextViewMode, setViewMode, useViewMode, viewModeSwitchLabel } from './viewModeStore';
import { IconToggleButton } from '@/features/surface-ui/IconToggleButton';

export function ViewModeToggle() {
  const mode = useViewMode();
  return (
    <IconToggleButton label={viewModeSwitchLabel(mode)} onClick={() => setViewMode(nextViewMode(mode))}>
      {mode === 'central' ? <ColumnsIcon /> : <CentralIcon />}
    </IconToggleButton>
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
