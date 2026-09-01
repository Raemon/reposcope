'use client';

import { useSyncExternalStore } from 'react';
import { errorMessage } from '@/features/surface-ui/errorMessage';

export type PullActionKind = 'merge' | 'close';

export interface PullTarget {
  owner: string;
  repo: string;
  number: number;
}

export interface PullAction extends PullTarget {
  kind: PullActionKind;
  state: 'running' | 'done' | 'failed';
  message: string;
}

const actions = new Map<string, PullAction>();
const listeners = new Set<() => void>();
const NONE: PullAction[] = [];
let snapshot: PullAction[] = NONE;

export function notePullAction(action: PullAction): void {
  const slug = `${action.owner}/${action.repo}#${action.number}`;
  // Delete before set so the newest activity sits last, for latestPullFailure.
  actions.delete(slug);
  actions.set(slug, action);
  snapshot = [...actions.values()];
  listeners.forEach((notify) => notify());
}

export function trackPullAction(target: PullTarget, kind: PullActionKind, refusal: Promise<string | null>): void {
  notePullAction({ ...target, kind, state: 'running', message: '' });
  refusal
    .then((refused) => notePullAction({ ...target, kind, state: refused ? 'failed' : 'done', message: refused ?? '' }))
    .catch((issue: unknown) => notePullAction({ ...target, kind, state: 'failed', message: errorMessage(issue) }));
}


export function usePullActions(): PullAction[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => NONE,
  );
}

export function pullActionFor(held: PullAction[], owner: string, repo: string, number: number): PullAction | null {
  return held.find((acted) => acted.owner === owner && acted.repo === repo && acted.number === number) ?? null;
}

export function latestPullFailure(held: PullAction[]): PullAction | null {
  const latest = held[held.length - 1];
  return latest && latest.state === 'failed' ? latest : null;
}

export function standingPulls<T extends PullTarget>(pulls: T[]): T[] {
  return withoutResolved(snapshot, pulls);
}

export function useStandingPulls<T extends PullTarget>(pulls: T[] | null | undefined): T[] {
  return withoutResolved(usePullActions(), pulls ?? []);
}

export function useStandingRepoPulls<T extends { number: number }>(owner: string, repo: string, pulls: T[] | null | undefined): T[] {
  const held = usePullActions();
  return (pulls ?? []).filter((pull) => !resolved(held, owner, repo, pull.number));
}

function withoutResolved<T extends PullTarget>(held: PullAction[], pulls: T[]): T[] {
  return pulls.filter((pull) => !resolved(held, pull.owner, pull.repo, pull.number));
}

function resolved(held: PullAction[], owner: string, repo: string, number: number): boolean {
  const action = pullActionFor(held, owner, repo, number);
  return action !== null && action.state !== 'failed';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
