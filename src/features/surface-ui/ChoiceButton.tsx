'use client';

import type { ReactNode } from 'react';
import { BUTTON } from './buttonStyles';
import { HoverCardTrigger } from './HoverCard';

export function ChoiceButton({
  label,
  active,
  className,
  labelled = false,
  onSelect,
  children,
}: {
  label: string;
  active: boolean;
  className: string;
  labelled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <HoverCardTrigger label={label} focusable={false} tooltipStyle>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        aria-label={labelled ? label : undefined}
        className={`${BUTTON} ${className} ${active ? 'bg-btn-active text-ink' : ''}`}
      >
        {children}
      </button>
    </HoverCardTrigger>
  );
}
