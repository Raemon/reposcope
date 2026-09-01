import type { DiffLine } from './diffLines';

export const ROW_HEIGHT = 15;
export const BLANK_ROW_HEIGHT = 4;
export const SAVE_BAR = 28;
export const EXPAND_MS = 200;

export function lineHeight(line: DiffLine): number {
  return line.blank ? BLANK_ROW_HEIGHT : ROW_HEIGHT;
}

export function linesHeight(lines: DiffLine[]): number {
  return lines.reduce((total, line) => total + lineHeight(line), 0);
}
