'use client';

import { useSyncExternalStore } from 'react';
import { normalizeSources, parseSources, serializeSource, sourceKey, type CodebaseSource } from './sourceTypes';

const SOURCES_KEY = 'apiscope.sources';
const TOKEN_KEY = 'apiscope.githubToken';
const NO_SOURCES: CodebaseSource[] = [];
const listeners = new Set<() => void>();
let held: { raw: string | null; sources: CodebaseSource[] } | null = null;

export function readSources(): CodebaseSource[] {
  const raw = readItem(SOURCES_KEY);
  if (!held || held.raw !== raw) held = { raw, sources: parseSources(raw) };
  return held.sources;
}

export function writeSources(sources: CodebaseSource[]): void {
  const kept = normalizeSources(sources);
  writeItem(SOURCES_KEY, kept.length === 0 ? null : JSON.stringify(kept.map(serializeSource)));
}

export function addSource(source: CodebaseSource): void {
  writeSources([...readSources(), source]);
}

export function removeSource(source: CodebaseSource): void {
  const key = sourceKey(source);
  writeSources(readSources().filter((candidate) => sourceKey(candidate) !== key));
}

export function readGithubToken(): string | null {
  return readItem(TOKEN_KEY);
}

export function writeGithubToken(token: string): void {
  writeItem(TOKEN_KEY, token);
}

export function clearGithubToken(): void {
  writeItem(TOKEN_KEY, null);
}

export function useSources(): CodebaseSource[] {
  return useSyncExternalStore(subscribe, readSources, () => NO_SOURCES);
}

export function useGithubToken(): string | null {
  return useSyncExternalStore(subscribe, readGithubToken, () => null);
}

export function useStoreReady(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {}
  for (const listener of listeners) listener();
}
