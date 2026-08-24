'use client';

import { useSyncExternalStore } from 'react';
import { normalizeSources, parseSources, serializeSource, sourceKey, type CodebaseSource } from './sourceTypes';
import { readRenamedItem } from '@/features/storage/renamedStorage';

const SOURCES_KEY = 'shoggoth.sources';
const LEGACY_SOURCES_KEY = 'reposcope.sources';
const TOKEN_KEY = 'shoggoth.githubToken';
const LEGACY_TOKEN_KEY = 'reposcope.githubToken';
const NO_SOURCES: CodebaseSource[] = [];
const listeners = new Set<() => void>();
let held: { raw: string | null; sources: CodebaseSource[] } | null = null;

function readSources(): CodebaseSource[] {
  const raw = readRenamedItem(SOURCES_KEY, LEGACY_SOURCES_KEY);
  if (!held || held.raw !== raw) held = { raw, sources: parseSources(raw) };
  return held.sources;
}

function writeSources(sources: CodebaseSource[]): void {
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

function readGithubToken(): string | null {
  return readRenamedItem(TOKEN_KEY, LEGACY_TOKEN_KEY);
}

export function writeGithubToken(token: string): void {
  writeItem(TOKEN_KEY, token);
}

export function clearGithubToken(): void {
  writeItem(TOKEN_KEY, null);
  writeItem(LEGACY_TOKEN_KEY, null);
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

function writeItem(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {}
  for (const listener of listeners) listener();
}
