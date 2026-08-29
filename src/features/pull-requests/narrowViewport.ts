'use client';

import { useSyncExternalStore } from 'react';

const NARROW = 'not all and (min-width: 48rem)';

export function useNarrowViewport(): boolean {
  return useSyncExternalStore(subscribeToWidth, () => window.matchMedia(NARROW).matches, () => false);
}

function subscribeToWidth(listener: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
