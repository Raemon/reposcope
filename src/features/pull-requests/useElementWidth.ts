'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

export function useElementWidth(node: RefObject<HTMLElement | null>, initial = 0): number {
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.offsetWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [node]);
  return width;
}
