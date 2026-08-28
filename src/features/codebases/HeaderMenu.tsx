'use client';

import { useRef, useState, type ReactNode } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from '@/features/surface-ui/selectableClick';
import { useMenuDismiss } from '@/features/surface-ui/useMenuDismiss';

export function HeaderMenu({
  label,
  width,
  children,
}: {
  label: ReactNode;
  width: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const labelClick = useSelectableClick<HTMLButtonElement>(() => setOpen((held) => !held));
  useMenuDismiss(menu, open, () => setOpen(false));

  return (
    <div ref={menu} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        {...labelClick}
        className={`flex max-w-[22rem] items-baseline gap-1 rounded px-1.5 py-0.5 text-[13px] ${SELECTABLE_TEXT} ${
          open ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
        }`}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="shrink-0 text-[9px] text-ink-dim/60">
          ▾
        </span>
      </button>
      {open && (
        <div
          className={`absolute left-0 top-full z-20 mt-1 flex max-h-[70vh] flex-col overflow-hidden rounded bg-panel shadow-card ${width}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
