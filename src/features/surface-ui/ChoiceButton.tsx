'use client';

import type { ReactNode } from 'react';
import { iconButtonClass, type IconButtonTone } from './buttonStyles';
import { HoverCardTrigger, type TipPlacement } from './HoverCard';

export function ChoiceButton({
  label,
  active,
  onSelect,
  tone,
  placement,
  children,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  tone?: IconButtonTone;
  placement?: TipPlacement;
  children: ReactNode;
}) {
  return (
    <HoverCardTrigger label={label} focusable={false} tooltipStyle placement={placement}>
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
