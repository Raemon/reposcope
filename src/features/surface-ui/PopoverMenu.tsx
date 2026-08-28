'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface PopoverTrigger {
  open: boolean;
  toggle: () => void;
}

export function PopoverMenu({
  align,
  panelClass,
  trigger,
  children,
}: {
  align: 'left-0' | 'right-0';
  panelClass: string;
  trigger: (state: PopoverTrigger) => ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useDismiss(menu, open, () => setOpen(false));
  return (
    <div ref={menu} className="relative shrink-0">
      {trigger({ open, toggle: () => setOpen((held) => !held) })}
      {open && (
        <div className={`absolute ${align} top-full z-20 mt-1 rounded bg-panel shadow-card ${panelClass}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function useDismiss(menu: { current: HTMLElement | null }, open: boolean, close: () => void): void {
  const pathname = usePathname();
  const dismiss = useRef(close);
  dismiss.current = close;

  useEffect(() => {
    dismiss.current();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) dismiss.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss.current();
    };
    document.addEventListener('mousedown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, menu]);
}
