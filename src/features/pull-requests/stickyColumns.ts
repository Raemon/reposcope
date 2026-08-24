'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ColumnSize } from './ResizableColumn';

const kept = new Map<string, ColumnSize>();
const followers = new Map<string, Set<(size: ColumnSize) => void>>();

export function setStickyColumn(name: string, next: SetStateAction<ColumnSize>): void {
  const held = kept.get(name);
  if (!held) return;
  const value = typeof next === 'function' ? next(held) : next;
  kept.set(name, value);
  followers.get(name)?.forEach((follow) => follow(value));
}

export function useStickyColumn(name: string, initial: ColumnSize): [ColumnSize, Dispatch<SetStateAction<ColumnSize>>] {
  const fallback = useRef(initial);
  fallback.current = initial;
  const [size, setSize] = useState(() => seeded(name, initial));
  useEffect(() => {
    setSize(seeded(name, fallback.current));
    const following = followers.get(name) ?? new Set();
    followers.set(name, following);
    following.add(setSize);
    return () => {
      following.delete(setSize);
    };
  }, [name]);
  const remember = useCallback<Dispatch<SetStateAction<ColumnSize>>>((next) => setStickyColumn(name, next), [name]);
  return [size, remember];
}

function seeded(name: string, initial: ColumnSize): ColumnSize {
  const held = kept.get(name);
  if (held) return held;
  kept.set(name, initial);
  return initial;
}
