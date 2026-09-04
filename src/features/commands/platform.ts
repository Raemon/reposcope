'use client';

import { useSyncExternalStore } from 'react';

export function isMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

// The server snapshot is false so hydration matches; the client re-reads after mount.
export function useIsMac(): boolean {
  return useSyncExternalStore(
    () => () => {},
    isMac,
    () => false,
  );
}
