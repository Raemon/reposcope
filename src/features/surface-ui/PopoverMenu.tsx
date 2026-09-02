'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from 'react';
import { focusFirstItem, focusableItems, holdsFocus } from './focusables';

export interface PopoverTrigger {
  open: boolean;
  toggle: () => void;
}

const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

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
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    if (holdsFocus(panel.current)) focusTrigger(menu.current);
    setOpen(false);
  }, []);

  useCloseOnNavigation(setOpen);
  useDismiss(menu, open, close);
  useEnterPanel(panel, open);

  return (
    <div ref={menu} className="relative shrink-0">
      {trigger({ open, toggle: () => setOpen((held) => !held) })}
      {open && (
        <div
          ref={panel}
          onKeyDown={(event) => stepFocus(event, panel.current)}
          className={`absolute ${align} top-full z-20 mt-1 rounded bg-panel shadow-card ${panelClass}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

function focusTrigger(menu: HTMLElement | null): void {
  menu?.querySelector<HTMLElement>('[aria-expanded]')?.focus();
}

function useEnterPanel(panel: RefObject<HTMLDivElement | null>, open: boolean): void {
  useEffect(() => {
    if (!open || holdsFocus(panel.current)) return;
    focusFirstItem(panel.current);
  }, [open, panel]);
}

function stepFocus(event: ReactKeyboardEvent<HTMLDivElement>, panel: HTMLElement | null): void {
  const step = ARROW_STEPS[event.key];
  if (step === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  focusNeighbour(focusableItems(panel), event.target, step);
}

function focusNeighbour(items: HTMLElement[], from: EventTarget, step: number): void {
  if (items.length === 0) return;
  const at = items.indexOf(from as HTMLElement);
  if (at < 0) return items[step > 0 ? 0 : items.length - 1]?.focus();
  items[(at + step + items.length) % items.length]?.focus();
}

function useCloseOnNavigation(setOpen: (open: false) => void): void {
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);
}

function useDismiss(menu: RefObject<HTMLDivElement | null>, open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const stops = [dismissOnOutsidePress(menu.current, close), dismissOnEscape(close)];
    return () => stops.forEach((stop) => stop());
  }, [open, menu, close]);
}

function dismissOnOutsidePress(menu: HTMLElement | null, close: () => void): () => void {
  const onPress = (event: MouseEvent) => {
    if (!menu?.contains(event.target as Node)) close();
  };
  document.addEventListener('mousedown', onPress);
  return () => document.removeEventListener('mousedown', onPress);
}

// Capture phase: Escape closes the menu without also resetting the column nav cursor.
function dismissOnEscape(close: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    close();
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}
