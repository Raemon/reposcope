'use client';

import { useSyncExternalStore } from 'react';

export interface OptimisticChange {
  id: string;
  keys: string[];
  revise: (key: string, data: unknown) => unknown;
}

const MAX_PENDING = 20;
const NONE: OptimisticChange[] = [];

let pending: OptimisticChange[] = NONE;
const confirmations = new Map<string, Set<string>>();
const listeners = new Set<() => void>();
const revisions = new WeakMap<object, { key: string; changes: OptimisticChange[]; result: unknown }>();

export function expectChange(change: OptimisticChange): void {
  confirmations.delete(change.id);
  pending = [...pending.filter((held) => held.id !== change.id), change].slice(-MAX_PENDING);
  announce();
}

export function reviseJson<T>(key: string, data: T, changes: OptimisticChange[] = pending): T {
  if (data === null || typeof data !== 'object') return data;
  const held = revisions.get(data);
  if (held && held.key === key && held.changes === changes) return held.result as T;
  const result = changes.reduce<T>(
    (carried, change) => (change.keys.includes(key) ? (change.revise(key, carried) as T) : carried),
    data,
  );
  revisions.set(data, { key, changes, result });
  return result;
}

export function confirmJson(key: string, data: unknown): void {
  for (const change of pending) {
    if (!change.keys.includes(key) || change.revise(key, data) !== data) continue;
    const keys = confirmations.get(change.id) ?? new Set<string>();
    keys.add(key);
    confirmations.set(change.id, keys);
  }
  const kept = pending.filter((change) => !settled(change));
  if (kept.length === pending.length) return;
  for (const change of pending) if (settled(change)) confirmations.delete(change.id);
  pending = kept;
  announce();
}

export function useOptimisticChanges(): OptimisticChange[] {
  return useSyncExternalStore(
    subscribe,
    () => pending,
    () => NONE,
  );
}

function settled(change: OptimisticChange): boolean {
  const keys = confirmations.get(change.id);
  return keys !== undefined && change.keys.every((name) => keys.has(name));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function announce(): void {
  listeners.forEach((notify) => notify());
}
