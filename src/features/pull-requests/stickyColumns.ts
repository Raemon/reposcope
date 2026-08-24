'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { ColumnSize } from './ResizableColumn';

const kept = new Map<string, ColumnSize>();

export function useStickyColumn(name: string, initial: ColumnSize): [ColumnSize, Dispatch<SetStateAction<ColumnSize>>] {
  const [size, setSize] = useState(() => kept.get(name) ?? initial);
  const remember = useCallback<Dispatch<SetStateAction<ColumnSize>>>(
    (next) =>
      setSize((held) => {
        const value = typeof next === 'function' ? next(held) : next;
        kept.set(name, value);
        return value;
      }),
    [name],
  );
  return [size, remember];
}
