'use client';

import { useSyncExternalStore } from 'react';

export interface MergeAttempt {
  owner: string;
  repo: string;
  number: number;
  state: 'merging' | 'merged' | 'failed';
  message: string;
}

const attempts = new Map<string, MergeAttempt>();
const listeners = new Set<() => void>();
const NONE: MergeAttempt[] = [];
let snapshot: MergeAttempt[] = NONE;

export function noteMergeAttempt(attempt: MergeAttempt): void {
  const slug = `${attempt.owner}/${attempt.repo}#${attempt.number}`;
  attempts.delete(slug);
  attempts.set(slug, attempt);
  snapshot = [...attempts.values()];
  listeners.forEach((notify) => notify());
}

export function useMergeAttempts(): MergeAttempt[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => NONE,
  );
}

export function mergeAttemptFor(
  held: MergeAttempt[],
  owner: string,
  repo: string,
  number: number,
): MergeAttempt | null {
  return held.find((tried) => tried.owner === owner && tried.repo === repo && tried.number === number) ?? null;
}

export function mergedAway(held: MergeAttempt[], owner: string, repo: string, number: number): boolean {
  const attempt = mergeAttemptFor(held, owner, repo, number);
  return attempt !== null && attempt.state !== 'failed';
}

export function latestMergeFailure(held: MergeAttempt[]): MergeAttempt | null {
  const latest = held[held.length - 1];
  return latest && latest.state === 'failed' ? latest : null;
}

export function mergeAttempts(): MergeAttempt[] {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
