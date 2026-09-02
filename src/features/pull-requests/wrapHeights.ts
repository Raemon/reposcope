'use client';

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { ROW_HEIGHT, type RowHeights } from './diffMetrics';
import type { DiffRow } from './splitDiff';

// Gutter (46px) plus the code cell's right padding: the width a wrapped line cannot use.
const CODE_INSET = 54;
const PROBE_CHARS = 100;

export interface WrapColumns {
  left: number;
  right: number;
}

/** Row heights tall enough for both sides' wrapped text, so split panes stay aligned. */
export function wrappedRowHeights(rows: DiffRow[], columns: WrapColumns | null, collapsed: Set<number>): RowHeights {
  if (!columns) return null;
  const heights = new Map<number, number>();
  rows.forEach((row, index) => {
    const height = collapsed.has(index) ? ROW_HEIGHT : wrappedRowHeight(row, columns);
    if (height > ROW_HEIGHT) heights.set(index, height);
  });
  return heights;
}

/** A zero width means unwrapped or unmeasured; leftWidth is 0 in single-column layouts. */
export function useWrapColumns(mainWidth: number, leftWidth: number, charWidth: number): WrapColumns | null {
  return useMemo(() => {
    if (mainWidth === 0 || charWidth === 0) return null;
    const right = columnsInPane(mainWidth - leftWidth, charWidth);
    return { left: leftWidth === 0 ? right : columnsInPane(leftWidth, charWidth), right };
  }, [mainWidth, leftWidth, charWidth]);
}

function wrappedRowHeight(row: DiffRow, columns: WrapColumns): number {
  if (row.kind === 'hunk') return ROW_HEIGHT;
  const left = visualLines(row.left?.text ?? '', columns.left);
  return Math.max(left, visualLines(row.right?.text ?? '', columns.right)) * ROW_HEIGHT;
}

function visualLines(text: string, columns: number): number {
  return Math.max(1, Math.ceil(text.length / columns));
}

export function columnsInPane(paneWidth: number, charWidth: number): number {
  return Math.max(1, Math.floor((paneWidth - CODE_INSET) / charWidth));
}

export function useElementWidth(node: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [node]);
  return width;
}

/** Measured rather than assumed: the mono stack resolves differently per platform. */
export function useCodeCharWidth(): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => setWidth(measureCharWidth()), []);
  return width;
}

function measureCharWidth(): number {
  const probe = document.createElement('span');
  probe.className = 'diff-code text-[11px]';
  probe.style.cssText = 'position:fixed;visibility:hidden;white-space:pre;top:-1000px;left:0';
  probe.textContent = 'M'.repeat(PROBE_CHARS);
  document.body.append(probe);
  const width = probe.getBoundingClientRect().width / PROBE_CHARS;
  probe.remove();
  return width;
}
