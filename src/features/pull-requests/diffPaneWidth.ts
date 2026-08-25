'use client';

import { localPref, usePref } from './localPref';
import { clampWidth, type ColumnSize } from './ResizableColumn';

const widthPref = localPref('reposcope.diffPaneWidth', 520, decodeWidth);

export function useDiffPaneWidth(): number {
  return usePref(widthPref);
}

export function setDiffPaneWidth(next: ColumnSize): void {
  widthPref.set(clampWidth(next.width));
}

function decodeWidth(stored: unknown): number | undefined {
  return typeof stored === 'number' && Number.isFinite(stored) ? clampWidth(stored) : undefined;
}
