'use client';

import { localPref, usePref } from './localPref';
import { clampWidth, useDragWidth, type ColumnSize } from './ResizableColumn';

const widthPref = localPref('reposcope.diffPaneWidth', 520, decodeWidth);

export function useDiffPaneDrag() {
  const width = usePref(widthPref);
  const startDrag = useDragWidth({ width, open: true }, rememberWidth);
  return { width, startDrag };
}

function rememberWidth(next: ColumnSize): void {
  widthPref.set(clampWidth(next.width));
}

function decodeWidth(stored: unknown): number | undefined {
  return typeof stored === 'number' && Number.isFinite(stored) ? clampWidth(stored) : undefined;
}
