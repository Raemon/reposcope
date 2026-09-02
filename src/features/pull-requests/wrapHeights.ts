'use client';

import { useLayoutEffect, useMemo, useState } from 'react';
import { ROW_HEIGHT, type RowHeight, type RowHeights } from './diffMetrics';
import type { DiffRow } from './splitDiff';

// Gutter, the row's gap, the code cell's padding, and the left pane's border, rounded up:
// too few columns only wraps early, too many lets a row outgrow the height both panes share.
const CODE_INSET = 60;
const PROBE_CHARS = 100;
const TAB_SIZE = 8;
const WIDE_CHAR = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/u;

export interface WrapColumns {
  left: number;
  right: number;
}

export function wrappedRowHeights(
  rows: DiffRow[],
  columns: WrapColumns | null,
  collapsed: Set<number>,
  splitPanes: boolean,
): RowHeights {
  if (!columns) return null;
  const heights = new Map<number, RowHeight>();
  rows.forEach((row, index) => {
    const height = collapsed.has(index) ? null : wrappedRowHeight(row, columns, splitPanes);
    if (height) heights.set(index, height);
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

function wrappedRowHeight(row: DiffRow, columns: WrapColumns, splitPanes: boolean): RowHeight | null {
  if (row.kind === 'hunk') return null;
  const left = ROW_HEIGHT * visualLines(row.left?.text ?? '', columns.left);
  const right = ROW_HEIGHT * visualLines(row.right?.text ?? '', columns.right);
  if (left === ROW_HEIGHT && right === ROW_HEIGHT) return null;
  return splitPanes ? evenSides(Math.max(left, right)) : { left, right };
}

/** Paired rows are drawn in two separate panes, which only line up at a shared height. */
function evenSides(height: number): RowHeight {
  return { left: height, right: height };
}

function visualLines(text: string, columns: number): number {
  return Math.max(1, Math.ceil(renderedColumns(text) / columns));
}

/** Tabs and full-width glyphs cover several columns each, so length alone under-counts. */
function renderedColumns(text: string): number {
  let width = 0;
  for (const char of text) width += charColumns(char, width);
  return width;
}

function charColumns(char: string, atColumn: number): number {
  if (char === '\t') return TAB_SIZE - (atColumn % TAB_SIZE);
  return WIDE_CHAR.test(char) || char.codePointAt(0)! > 0xffff ? 2 : 1;
}

export function columnsInPane(paneWidth: number, charWidth: number): number {
  return Math.max(1, Math.floor((paneWidth - CODE_INSET) / charWidth));
}

/** Measured rather than assumed: the mono stack resolves differently per platform. */
export function useCodeCharWidth(): number {
  const [width, setWidth] = useState(measured);
  useLayoutEffect(() => setWidth(measureCharWidth()), []);
  return width;
}

let measured = 0;

function measureCharWidth(): number {
  if (measured > 0) return measured;
  const probe = document.createElement('span');
  probe.className = 'diff-code text-[11px]';
  probe.style.cssText = 'position:fixed;visibility:hidden;white-space:pre;top:-1000px;left:0';
  probe.textContent = 'M'.repeat(PROBE_CHARS);
  document.body.append(probe);
  measured = probe.getBoundingClientRect().width / PROBE_CHARS;
  probe.remove();
  return measured;
}
