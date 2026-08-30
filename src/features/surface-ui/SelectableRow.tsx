'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from './selectableClick';

export function SelectableRow({
  onActivate,
  className,
  style,
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
  style?: CSSProperties;
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
      onPointerEnter={onPointerEnter}
      data-nav-cursor={cursor || undefined}
      aria-label={label}
      aria-expanded={expanded}
      aria-current={current ? 'page' : undefined}
      style={style}
      className={`${className} ${SELECTABLE_TEXT}`}
    >
      {children}
    </button>
  );
}
