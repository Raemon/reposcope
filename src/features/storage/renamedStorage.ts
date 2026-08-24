'use client';

export function readRenamedItem(key: string, legacyKey: string): string | null {
  const current = readItem(key);
  return current === null ? readItem(legacyKey) : current;
}

export function purgeLegacyPrefix(legacyPrefix: string): void {
  try {
    for (const name of Object.keys(window.localStorage)) {
      if (name.startsWith(legacyPrefix)) window.localStorage.removeItem(name);
    }
  } catch {}
}

function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
