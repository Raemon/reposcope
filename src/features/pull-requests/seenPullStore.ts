'use client';

import { useEffect } from 'react';
import { localPref, usePref } from './localPref';
import type { CrossRepoPull } from './pullRequests';

const KEEP = 4_000;
const DWELL_MS = 4_000;

export interface SeenPull {
  sha: string;
  at: number;
}

export type SeenPulls = Record<string, SeenPull>;

const seenPref = localPref<SeenPulls>('reposcope.seenPulls', {}, decodeSeen);

export function pullSeenKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}#${number}`.toLowerCase();
}

export function crossRepoSeenKey(pull: CrossRepoPull): string {
  return pullSeenKey(pull.owner, pull.repo, pull.number);
}

export function useSeenPulls(): SeenPulls {
  return usePref(seenPref);
}

export function readSeenPulls(): SeenPulls {
  return seenPref.read();
}

export function markPullSeen(key: string, sha: string): void {
  const held = { ...seenPref.read() };
  delete held[key];
  seenPref.set(pruned({ ...held, [key]: { sha, at: Date.now() } }));
}

export function useMarkSeenAfterDwell(key: string, sha: string | null): void {
  useEffect(() => (sha === null ? undefined : watchDwell(key, sha)), [key, sha]);
}

function watchDwell(key: string, sha: string): () => void {
  const dwell = visibleDwell();
  const markIfDwelt = () => {
    if (dwell.visibleMs() >= DWELL_MS) markPullSeen(key, sha);
  };
  const stopListening = listenWhileOpen(dwell.onVisibilityChange, markIfDwelt);
  return () => {
    stopListening();
    markIfDwelt();
  };
}

function listenWhileOpen(onVisibilityChange: () => void, onPageHide: () => void): () => void {
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
  };
}

function visibleDwell(): { onVisibilityChange: () => void; visibleMs: () => number } {
  let banked = 0;
  let shownAt = shownAtNow();
  const currentSpan = () => (shownAt === null ? 0 : Date.now() - shownAt);
  return {
    onVisibilityChange() {
      banked += currentSpan();
      shownAt = shownAtNow();
    },
    visibleMs: () => banked + currentSpan(),
  };
}

function shownAtNow(): number | null {
  return document.visibilityState === 'visible' ? Date.now() : null;
}

function pruned(held: SeenPulls): SeenPulls {
  const keys = Object.keys(held);
  if (keys.length <= KEEP) return held;
  return Object.fromEntries(keys.slice(keys.length - KEEP).map((key) => [key, held[key]!]));
}

function decodeSeen(stored: unknown): SeenPulls | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  return Object.fromEntries(Object.entries(stored).filter(([, seen]) => isSeenPull(seen))) as SeenPulls;
}

function isSeenPull(value: unknown): boolean {
  const seen = value as SeenPull | null;
  return typeof seen?.sha === 'string' && typeof seen.at === 'number';
}
