'use client';

import type { ReactNode, Ref } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from './selectableClick';

export function SelectableRow({
  onActivate,
  className,
  title,
  label,
  expanded,
  current,
  cursor,
  onPointerEnter,
  ref,
  children,
}: {
  onActivate: () => void;
  className: string;
  title?: string;
  label?: string;
  expanded?: boolean;
  current?: boolean;
  cursor?: boolean;
  onPointerEnter?: () => void;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  const rowClick = useSelectableClick<HTMLButtonElement>(onActivate);
  return (
    <button
      ref={ref}
      type="button"
      {...rowClick}
      title={title}
      onPointerEnter={onPointerEnter}
      data-nav-cursor={cursor || undefined}
      aria-label={label}
      aria-expanded={expanded}
      aria-current={current ? 'page' : undefined}
      className={`${className} ${SELECTABLE_TEXT}`}
    >
      {children}
    </button>
  );
}
