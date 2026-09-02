'use client';

import type { ReactNode } from 'react';
import { iconButtonClass, type IconButtonTone } from './buttonStyles';
import { HoverCardTrigger } from './HoverCard';

export function ChoiceButton({
  label,
  active,
  onSelect,
  tone,
  children,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  tone?: IconButtonTone;
  children: ReactNode;
}) {
  return (
    <HoverCardTrigger label={label} focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={label}
        className={iconButtonClass(active, tone)}
      >
        {children}
      </button>
    </HoverCardTrigger>
  );
}
