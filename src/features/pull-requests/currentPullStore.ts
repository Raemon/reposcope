'use client';

import { useSyncExternalStore } from 'react';
import type { PullRequestCommits } from './pullRequests';

export interface CurrentPull {
  owner: string;
  repo: string;
  pull: PullRequestCommits;
  reload: () => Promise<unknown>;
}

let current: CurrentPull | null = null;
const listeners = new Set<() => void>();

export function setCurrentPull(next: CurrentPull | null): void {
  current = next;
  listeners.forEach((notify) => notify());
}

export function reloadCurrentPull(): Promise<unknown> {
  return current?.reload() ?? Promise.resolve();
}

export function useCurrentPull(owner: string, repo: string, number: number): PullRequestCommits | null {
  const held = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return held && held.owner === owner && held.repo === repo && held.pull.pull.number === number ? held.pull : null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
