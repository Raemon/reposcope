'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { localPref, usePref } from './localPref';
import { clampWidth, type ColumnSize } from './ResizableColumn';

const DEFAULTS: Record<string, ColumnSize> = {
  pulls: { width: 300, open: false },
  'all-pulls': { width: 380, open: true },
  branches: { width: 300, open: false },
  discussion: { width: 320, open: false },
  commits: { width: 260, open: true },
  files: { width: 280, open: true },
  'all-files': { width: 280, open: false },
  'repo-files': { width: 320, open: true },
};

const columnsPref = localPref<Partial<Record<string, ColumnSize>>>('reposcope.columns', {}, decodeColumns);

export function setStickyColumn(name: string, next: SetStateAction<ColumnSize>, defaultOpen?: boolean): void {
  const held = columnsPref.read();
  const base = held[name] ?? defaultSize(name, defaultOpen);
  columnsPref.set({ ...held, [name]: typeof next === 'function' ? next(base) : next });
}

export function useStickyColumn(name: string, defaultOpen?: boolean): [ColumnSize, Dispatch<SetStateAction<ColumnSize>>] {
  const size = usePref(columnsPref)[name] ?? defaultSize(name, defaultOpen);
  const remember = useCallback<Dispatch<SetStateAction<ColumnSize>>>((next) => setStickyColumn(name, next, defaultOpen), [name, defaultOpen]);
  return [size, remember];
}

export function useStickyOpen(name: string): [boolean, (open: boolean) => void] {
  const [size, setSize] = useStickyColumn(name);
  const setOpen = useCallback((open: boolean) => setSize((held) => ({ ...held, open })), [setSize]);
  return [size.open, setOpen];
}

function defaultSize(name: string, defaultOpen?: boolean): ColumnSize {
  const held = DEFAULTS[name] ?? { width: 300, open: true };
  return defaultOpen === undefined ? held : { ...held, open: defaultOpen };
}

function decodeColumns(stored: unknown): Partial<Record<string, ColumnSize>> | undefined {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return undefined;
  const columns: Record<string, ColumnSize> = {};
  for (const [name, size] of Object.entries(stored)) {
    if (isColumnSize(size)) columns[name] = { width: clampWidth(size.width), open: size.open };
  }
  return columns;
}

function isColumnSize(size: unknown): size is ColumnSize {
  if (typeof size !== 'object' || size === null) return false;
  const { width, open } = size as { width?: unknown; open?: unknown };
  return typeof width === 'number' && Number.isFinite(width) && typeof open === 'boolean';
}
