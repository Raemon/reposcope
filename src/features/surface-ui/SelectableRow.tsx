'use client';

import type { ReactNode } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from './selectableClick';

export function SelectableRow({
  onActivate,
  className,
  title,
  label,
  expanded,
  current,
  children,
}: {
  onActivate: () => void;
  className: string;
  title?: string;
  label?: string;
  expanded?: boolean;
  current?: boolean;
  children: ReactNode;
}) {
  const rowClick = useSelectableClick<HTMLButtonElement>(onActivate);
  return (
    <button
      type="button"
      {...rowClick}
      title={title}
      aria-label={label}
      aria-expanded={expanded}
      aria-current={current ? 'page' : undefined}
      className={`${className} ${SELECTABLE_TEXT}`}
    >
      {children}
    </button>
  );
}
