'use client';

import type { ReactNode } from 'react';
import { iconButtonClass } from './buttonStyles';
import { HoverCardTrigger } from './HoverCard';

export function ChoiceButton({
  label,
  active,
  onSelect,
  children,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <HoverCardTrigger label={label} focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={label}
        className={iconButtonClass(active)}
      >
        {children}
      </button>
    </HoverCardTrigger>
  );
}
