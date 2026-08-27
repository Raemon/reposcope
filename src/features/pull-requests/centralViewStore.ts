'use client';

import { useSyncExternalStore } from 'react';

let central = false;
const listeners = new Set<() => void>();

export function setCentralView(next: boolean): void {
  central = next;
  listeners.forEach((notify) => notify());
}

export function useCentralView(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => central,
    () => false,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
