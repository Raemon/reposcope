'use client';

import { localPref, usePref } from './localPref';
import { clampWidth, type ColumnSize } from './ResizableColumn';

export const DEFAULT_DIFF_PANE_WIDTH = 560;

const widthPref = localPref('reposcope.diffPaneWidth', DEFAULT_DIFF_PANE_WIDTH, decodeWidth);

export function useDiffPaneWidth(): number {
  return usePref(widthPref);
}

export function splitDiffBasis(paneWidth: number): number {
  return paneWidth * 2;
}

export function setDiffPaneWidth(next: ColumnSize): void {
  widthPref.set(clampWidth(next.width));
}

function decodeWidth(stored: unknown): number | undefined {
  return typeof stored === 'number' && Number.isFinite(stored) ? clampWidth(stored) : undefined;
}
