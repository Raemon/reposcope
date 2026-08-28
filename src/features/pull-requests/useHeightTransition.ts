'use client';

import { useLayoutEffect, useRef } from 'react';
import { EXPAND_MS } from './diffMetrics';
import type { DiffRow } from './splitDiff';

export function useHeightTransition(rows: DiffRow[], hidden: Set<number>) {
  const node = useRef<HTMLDivElement | null>(null);
  const measured = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const height = element.scrollHeight;
    const from = measured.current;
    measured.current = height;
    if (from === null || from === height) return;
    return playGrow(element, from, height);
  }, [rows, hidden]);

  return node;
}

function playGrow(element: HTMLElement, from: number, to: number) {
  let inner = 0;
  let settle: ReturnType<typeof setTimeout> | null = null;
  lockHeight(element, from);
  // Wait a frame so newly rendered rows exist before the 200ms grow starts.
  const start = requestAnimationFrame(() => {
    inner = requestAnimationFrame(() => {
      element.style.transition = `height ${EXPAND_MS}ms ease-out`;
      element.style.height = `${to}px`;
      settle = setTimeout(() => clearInlineSize(element), EXPAND_MS);
    });
  });
  return () => {
    cancelAnimationFrame(start);
    cancelAnimationFrame(inner);
    if (settle) clearTimeout(settle);
    clearInlineSize(element);
  };
}

function lockHeight(element: HTMLElement, from: number) {
  element.style.overflow = 'hidden';
  element.style.height = `${from}px`;
  element.style.transition = '';
}

function clearInlineSize(element: HTMLElement) {
  element.style.transition = '';
  element.style.height = '';
  element.style.overflow = '';
}
