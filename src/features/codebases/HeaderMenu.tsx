'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function HeaderMenu({
  label,
  width,
  children,
}: {
  label: string;
  width: string;
  children: (close: () => void) => ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

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
        onClick={() => setOpen((held) => !held)}
        className={`rounded border border-btn-edge px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
          open ? 'bg-btn-active text-accent' : 'text-ink-dim hover:bg-btn-hover hover:text-ink'
        }`}
      >
        {label} ▾
      </button>
      {open && (
        <div
          className={`absolute left-0 top-full z-20 mt-1 flex max-h-[70vh] flex-col overflow-hidden rounded border border-panel-edge bg-panel shadow-lg ${width}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
