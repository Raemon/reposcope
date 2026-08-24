'use client';

import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import type { ColumnSize } from './ResizableColumn';

const kept = new Map<string, ColumnSize>();
const listeners = new Set<() => void>();

export function setStickyColumn(name: string, next: SetStateAction<ColumnSize>): void {
  const held = kept.get(name);
  if (!held) return;
  kept.set(name, typeof next === 'function' ? next(held) : next);
  listeners.forEach((notify) => notify());
}

export function useStickyColumn(name: string, initial: ColumnSize): [ColumnSize, Dispatch<SetStateAction<ColumnSize>>] {
  if (!kept.has(name)) kept.set(name, initial);
  const size = useSyncExternalStore(subscribe, () => kept.get(name) ?? initial, () => initial);
  const remember = useCallback<Dispatch<SetStateAction<ColumnSize>>>((next) => setStickyColumn(name, next), [name]);
  return [size, remember];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
