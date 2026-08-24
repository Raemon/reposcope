'use client';

const PREFIX = 'reposcope.cache.';
const MAX_ENTRIES = 60;

interface CachedEntry {
  storedAt: number;
  value: unknown;
}

const memory = new Map<string, CachedEntry>();

export function readBrowserCache<T>(key: string): T | null {
  const entry = memory.get(key) ?? readStored(key);
  if (!entry) return null;
  remember(key, entry);
  return entry.value as T;
}

export function writeBrowserCache(key: string, value: unknown): void {
  const entry = { storedAt: Date.now(), value };
  remember(key, entry);
  if (store(key, entry)) return;
  dropOldest(Math.ceil(storedNames().length / 2));
  store(key, entry);
}

function remember(key: string, entry: CachedEntry): void {
  memory.delete(key);
  memory.set(key, entry);
  while (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value as string);
}

function store(key: string, entry: CachedEntry): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    return false;
  }
  dropOldest(storedNames().length - MAX_ENTRIES);
  return true;
}

function readStored(key: string): CachedEntry | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as CachedEntry);
  } catch {
    return null;
  }
}

function dropOldest(count: number): void {
  if (count <= 0) return;
  const aged = storedNames()
    .map((name) => ({ name, storedAt: storedTime(name) }))
    .sort((a, b) => a.storedAt - b.storedAt);
  for (const { name } of aged.slice(0, count)) window.localStorage.removeItem(name);
}

function storedNames(): string[] {
  try {
    return Object.keys(window.localStorage).filter((name) => name.startsWith(PREFIX));
  } catch {
    return [];
  }
}

function storedTime(name: string): number {
  try {
    return (JSON.parse(window.localStorage.getItem(name) ?? '{}') as CachedEntry).storedAt ?? 0;
  } catch {
    return 0;
  }
}
