'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, type RefObject } from 'react';

export function useMenuDismiss(menu: RefObject<HTMLElement | null>, open: boolean, close: () => void): void {
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
