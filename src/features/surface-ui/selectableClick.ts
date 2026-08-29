'use client';

import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

export const SELECTABLE_TEXT = 'select-text';

const DRAG_SLOP_PX = 3;

export function useSelectableClick<T extends HTMLElement>(activate?: (event: ReactMouseEvent<T>) => void) {
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  return {
    draggable: false,
    onPointerDown: (event: ReactPointerEvent<T>) => {
      pressedAt.current = { x: event.clientX, y: event.clientY };
    },
    onClick: (event: ReactMouseEvent<T>) => {
      if (selectedTextInside(event.currentTarget, pressedAt.current, event)) {
        event.preventDefault();
        return;
      }
      activate?.(event);
    },
  };
}

export function opensAnotherTab<T extends HTMLElement>(event: ReactMouseEvent<T>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function selectedTextInside<T extends HTMLElement>(
  row: T,
  pressedAt: { x: number; y: number } | null,
  event: ReactMouseEvent<T>,
): boolean {
  if (event.detail === 0 || pressedAt === null) return false;
  const dragged = Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y);
  if (dragged < DRAG_SLOP_PX) return false;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.toString().trim() === '') return false;
  return row.contains(selection.anchorNode) || row.contains(selection.focusNode);
}
