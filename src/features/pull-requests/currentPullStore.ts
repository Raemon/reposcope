'use client';

import { useSyncExternalStore } from 'react';
import type { PullRequestCommits } from './pullRequests';

let current: PullRequestCommits | null = null;
const listeners = new Set<() => void>();

export function setCurrentPull(pull: PullRequestCommits | null): void {
  current = pull;
  listeners.forEach((notify) => notify());
}

export function useCurrentPull(): PullRequestCommits | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
