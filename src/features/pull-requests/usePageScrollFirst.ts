'use client';

import { useEffect, useRef } from 'react';

// Wheel events over the row would scroll the diff first and leave the discussion pinned above it.
export function usePageScrollFirst(active: boolean) {
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = row.current;
    const page = node?.parentElement;
    if (!active || !node || !page) return;
    const onWheel = (event: WheelEvent) => {
      if (!scrollsPageDown(event) || pageScrollLeft(page) < 1) return;
      event.preventDefault();
      page.scrollTop += event.deltaY;
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [active]);
  return row;
}

function scrollsPageDown(event: WheelEvent): boolean {
  return event.deltaY > 0 && event.deltaY >= Math.abs(event.deltaX);
}

function pageScrollLeft(page: HTMLElement): number {
  return page.scrollHeight - page.clientHeight - page.scrollTop;
}
