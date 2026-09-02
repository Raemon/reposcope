import type { DiffLine } from './diffLines';

export const ROW_HEIGHT = 15;
export const BLANK_ROW_HEIGHT = 4;
export const SAVE_BAR = 28;
export const EXPAND_MS = 200;

/** Row index to height, for rows wrapped past one line; null when wrapping is off. */
export type RowHeights = Map<number, number> | null;

export function lineHeight(line: DiffLine, heights: RowHeights = null): number {
  if (line.blank) return BLANK_ROW_HEIGHT;
  return heights?.get(line.row) ?? ROW_HEIGHT;
}

export function linesHeight(lines: DiffLine[], heights: RowHeights = null): number {
  return lines.reduce((total, line) => total + lineHeight(line, heights), 0);
}
