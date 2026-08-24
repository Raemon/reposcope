'use client';

import { useSyncExternalStore } from 'react';

let merges = 0;
const listeners = new Set<() => void>();

export function announceMerge(): void {
  merges += 1;
  listeners.forEach((notify) => notify());
}

export function useMergeCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => merges,
    () => 0,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
