'use client';

import { useSyncExternalStore } from 'react';

const NARROW = '(max-width: 760px)';

export function useNarrowViewport(): boolean {
  return useSyncExternalStore(subscribeToWidth, () => window.matchMedia(NARROW).matches, () => false);
}

function subscribeToWidth(listener: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
