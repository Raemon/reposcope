'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from '@/features/surface-ui/selectableClick';

export function HeaderMenu({
  label,
  width,
  children,
}: {
  label: ReactNode;
  width: string;
  children: (close: () => void) => ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const labelClick = useSelectableClick<HTMLButtonElement>(() => setOpen((held) => !held));

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
