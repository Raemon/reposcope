'use client';

import { memoryPref, usePref } from './localPref';

export type FoldMode = 'default' | 'expandAll' | 'collapseAll' | 'collapseUnchanged';

export interface FoldCommand {
  mode: FoldMode;
  epoch: number;
}

const foldCommand = memoryPref<FoldCommand>({ mode: 'default', epoch: 0 });

export function applyFoldMode(mode: FoldMode): void {
  foldCommand.set({ mode, epoch: foldCommand.read().epoch + 1 });
}

export function useFoldCommand(): FoldCommand {
  return usePref(foldCommand);
}
