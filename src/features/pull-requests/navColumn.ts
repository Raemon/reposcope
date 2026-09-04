export type ColumnId = 'pulls' | 'discussion' | 'commits' | 'files' | 'diff' | 'ai-chat';

export const COLUMN_ORDER: ColumnId[] = ['pulls', 'discussion', 'commits', 'files', 'diff', 'ai-chat'];

export const COLUMN_HEADER = 'nav:header';

export interface NavColumn {
  items: string[];
  selected: string | null;
  open: boolean;
  collapsible: boolean;
  setOpen?: (open: boolean) => void;
  onSelect?: (item: string) => void;
  onActivate?: (item: string) => void;
}

export function cursorRing(column: NavColumn): string[] {
  if (!column.open) return column.items;
  return column.collapsible ? [COLUMN_HEADER, ...column.items] : column.items;
}

export function nextCursor(column: NavColumn, held: string | null, delta: number): string | null {
  if (held === null && column.selected !== null) return column.selected;
  return stepRing(cursorRing(column), held, delta);
}

export function stepColumn(from: ColumnId, delta: number): ColumnId {
  return COLUMN_ORDER[clamp(COLUMN_ORDER.indexOf(from) + delta, COLUMN_ORDER.length)] ?? from;
}

export function stepRing(ring: string[], from: string | null, delta: number): string | null {
  const at = from === null ? -1 : ring.indexOf(from);
  const next = at < 0 ? firstOf(ring, delta) : at + delta;
  return ring[clamp(next, ring.length)] ?? null;
}

function firstOf(ring: string[], delta: number): number {
  return delta > 0 ? 0 : ring.length - 1;
}

function clamp(index: number, length: number): number {
  return Math.min(length - 1, Math.max(0, index));
}
