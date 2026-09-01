'use client';

import { memoryPref, usePref } from './localPref';

export interface DraftAnchor {
  path: string;
  line: number;
  side: 'left' | 'right';
}

const draftAnchor = memoryPref<DraftAnchor | null>(null);

export function startDraftThread(anchor: DraftAnchor): void {
  draftAnchor.set(anchor);
}

export function clearDraftThread(): void {
  draftAnchor.set(null);
}

export function useDraftAnchor(): DraftAnchor | null {
  return usePref(draftAnchor);
}
