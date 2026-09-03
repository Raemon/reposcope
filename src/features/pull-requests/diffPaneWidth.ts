'use client';

import { clampedPref, usePref } from './localPref';
import { clampWidth, type ColumnSize } from './ResizableColumn';

const widthPref = clampedPref('reposcope.diffPaneWidth', 520, clampWidth);

export function useDiffPaneWidth(): number {
  return usePref(widthPref);
}

export function setDiffPaneWidth(next: ColumnSize): void {
  widthPref.set(clampWidth(next.width));
}
