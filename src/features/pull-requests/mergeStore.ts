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
  // Delete before set so the newest activity sits last, for latestMergeFailure.
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

export function latestMergeFailure(held: MergeAttempt[]): MergeAttempt | null {
  const latest = held[held.length - 1];
  return latest && latest.state === 'failed' ? latest : null;
}

export function standingPulls<T extends { owner: string; repo: string; number: number }>(pulls: T[]): T[] {
  return withoutMergedAway(snapshot, pulls);
}

export function useStandingPulls<T extends { owner: string; repo: string; number: number }>(pulls: T[] | null | undefined): T[] {
  return withoutMergedAway(useMergeAttempts(), pulls ?? []);
}

export function useStandingRepoPulls<T extends { number: number }>(owner: string, repo: string, pulls: T[] | null | undefined): T[] {
  const held = useMergeAttempts();
  return (pulls ?? []).filter((pull) => !mergedAway(held, owner, repo, pull.number));
}

function withoutMergedAway<T extends { owner: string; repo: string; number: number }>(held: MergeAttempt[], pulls: T[]): T[] {
  return pulls.filter((pull) => !mergedAway(held, pull.owner, pull.repo, pull.number));
}

function mergedAway(held: MergeAttempt[], owner: string, repo: string, number: number): boolean {
  const attempt = mergeAttemptFor(held, owner, repo, number);
  return attempt !== null && attempt.state !== 'failed';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
