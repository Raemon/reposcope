'use client';

import { useSyncExternalStore } from 'react';
import { normalizeSources, parseSources, serializeSource, sourceKey, type CodebaseSource } from './sourceTypes';
import { parseGithubAccess, type GithubAccess } from '@/features/github-auth/githubAccess';

const SOURCES_KEY = 'reposcope.sources';
const TOKEN_KEY = 'reposcope.githubToken';
const ACCESS_KEY = 'reposcope.githubAccess';
const RENEWAL_KEY = 'reposcope.githubRenewal';
const SIGNED_OUT_KEY = 'reposcope.githubSignedOut';
const NO_SOURCES: CodebaseSource[] = [];
const listeners = new Set<() => void>();
let held: { raw: string | null; sources: CodebaseSource[] } | null = null;
let signedOutHeld: { raw: string | null; value: GithubSignedOut | null } | null = null;

export interface GithubRenewal {
  refreshToken: string | null;
  expiresAt: number | null;
  refreshExpiresAt: number | null;
}

export interface GithubSession extends GithubRenewal {
  token: string;
  access: GithubAccess;
}

export interface GithubSignedOut {
  reason: string;
  access: GithubAccess;
}

const NO_RENEWAL: GithubRenewal = { refreshToken: null, expiresAt: null, refreshExpiresAt: null };

function readSources(): CodebaseSource[] {
  const raw = readItem(SOURCES_KEY);
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

export function readGithubToken(): string | null {
  return readItem(TOKEN_KEY);
}

export function writeGithubSession({ token, access, ...renewal }: GithubSession): void {
  writeItem(SIGNED_OUT_KEY, null);
  writeItem(ACCESS_KEY, access);
  writeItem(RENEWAL_KEY, JSON.stringify(renewal));
  writeItem(TOKEN_KEY, token);
}

export function readGithubRenewal(): GithubRenewal {
  const stored = parseJson<Partial<GithubRenewal>>(readItem(RENEWAL_KEY));
  return stored ? { ...NO_RENEWAL, ...stored } : NO_RENEWAL;
}

export function disconnectGithub(): void {
  writeItem(SIGNED_OUT_KEY, null);
  forgetGithubSession();
}

export function signOutGithub(reason: string): void {
  if (readGithubToken() === null) return;
  writeItem(SIGNED_OUT_KEY, JSON.stringify({ reason, access: readGithubAccess() }));
  forgetGithubSession();
}

export function dismissGithubSignOut(): void {
  writeItem(SIGNED_OUT_KEY, null);
}

function forgetGithubSession(): void {
  writeItem(ACCESS_KEY, null);
  writeItem(RENEWAL_KEY, null);
  writeItem(TOKEN_KEY, null);
  removeSource({ kind: 'viewer' });
}

export function readGithubAccess(): GithubAccess {
  return parseGithubAccess(readItem(ACCESS_KEY));
}

function readSignedOut(): GithubSignedOut | null {
  const raw = readItem(SIGNED_OUT_KEY);
  if (!signedOutHeld || signedOutHeld.raw !== raw) signedOutHeld = { raw, value: parseJson<GithubSignedOut>(raw) };
  return signedOutHeld.value;
}

function parseJson<T>(raw: string | null): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function useSources(): CodebaseSource[] {
  return useSyncExternalStore(subscribe, readSources, () => NO_SOURCES);
}

export function useGithubToken(): string | null {
  return useSyncExternalStore(subscribe, readGithubToken, () => null);
}

export function useGithubAccess(): GithubAccess {
  return useSyncExternalStore(subscribe, readGithubAccess, () => 'all' as const);
}

export function useGithubSignedOut(): GithubSignedOut | null {
  return useSyncExternalStore(subscribe, readSignedOut, () => null);
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
