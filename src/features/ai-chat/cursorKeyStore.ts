'use client';

import { localPref, usePref } from '@/features/pull-requests/localPref';
import { CURSOR_KEY_HEADER } from './cursorTypes';

const keyPref = localPref<string | null>('reposcope.cursorKey', null, decodeKey);

export function cursorHeaders(key: string): Record<string, string> {
  return { [CURSOR_KEY_HEADER]: key };
}

export function writeCursorKey(key: string | null): void {
  keyPref.set(key);
}

export function useCursorKey(): string | null {
  return usePref(keyPref);
}

function decodeKey(stored: unknown): string | undefined {
  return typeof stored === 'string' && stored !== '' ? stored : undefined;
}
