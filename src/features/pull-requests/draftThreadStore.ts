'use client';

import type { DraftAnchor } from './draftThread';
import { memoryPref, usePref } from './localPref';

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
