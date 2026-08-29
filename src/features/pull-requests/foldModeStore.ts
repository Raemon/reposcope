'use client';

import { memoryPref, usePref } from './localPref';

export type FoldMode = 'default' | 'expandAll' | 'collapseAll' | 'gitDefault';

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

export function currentFoldMode(): FoldMode {
  return foldCommand.read().mode;
}

export function wholeFileMode(mode: FoldMode): boolean {
  return mode === 'default';
}

export function setsWholeFile(mode: FoldMode): boolean {
  return mode === 'default' || mode === 'gitDefault';
}
