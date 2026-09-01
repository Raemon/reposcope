'use client';

import { useEffect } from 'react';
import { localPref, usePref } from './localPref';
import type { CrossRepoPull } from './pullRequests';

const KEEP = 400;
const DWELL_MS = 4_000;

const seenPref = localPref<Record<string, string>>('reposcope.seenPulls', {}, decodeSeen);

export function pullSeenKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}#${number}`;
}

export function crossRepoSeenKey(pull: CrossRepoPull): string {
  return pullSeenKey(pull.owner, pull.repo, pull.number);
}

export function useSeenPulls(): Record<string, string> {
  return usePref(seenPref);
}

export function readSeenPulls(): Record<string, string> {
  return seenPref.read();
}

export function markPullSeen(key: string, headSha: string): void {
  const held = { ...seenPref.read() };
  delete held[key];
  seenPref.set(pruned({ ...held, [key]: headSha }));
}

export function useMarkSeenAfterDwell(key: string, headSha: string | null): void {
  useEffect(() => (headSha === null ? undefined : watchDwell(key, headSha)), [key, headSha]);
}

function watchDwell(key: string, headSha: string): () => void {
  const markIfDwelt = dwellMarker(key, headSha);
  window.addEventListener('pagehide', markIfDwelt);
  return () => {
    window.removeEventListener('pagehide', markIfDwelt);
    markIfDwelt();
  };
}

function dwellMarker(key: string, headSha: string): () => void {
  const openedAt = Date.now();
  return () => {
    if (Date.now() - openedAt >= DWELL_MS) markPullSeen(key, headSha);
  };
}

function pruned(held: Record<string, string>): Record<string, string> {
  const keys = Object.keys(held);
  if (keys.length <= KEEP) return held;
  return Object.fromEntries(keys.slice(keys.length - KEEP).map((key) => [key, held[key]!]));
}

function decodeSeen(stored: unknown): Record<string, string> | undefined {
  if (typeof stored !== 'object' || stored === null) return undefined;
  const entries = Object.entries(stored).filter(([, sha]) => typeof sha === 'string');
  return Object.fromEntries(entries) as Record<string, string>;
}
