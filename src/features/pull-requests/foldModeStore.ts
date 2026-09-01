'use client';

import { memoryPref, usePref } from './localPref';

export type FoldMode = 'default' | 'expandAll' | 'collapseAll' | 'gitDefault';

export interface FoldCommand {
  mode: FoldMode;
  epoch: number;
  wholeFile: boolean;
}

const foldCommand = memoryPref<FoldCommand>({ mode: 'default', epoch: 0, wholeFile: true });

export function applyFoldMode(mode: FoldMode): void {
  const held = foldCommand.read();
  foldCommand.set({ mode, epoch: held.epoch + 1, wholeFile: wholeFileFor(mode) ?? held.wholeFile });
}

export function useFoldCommand(): FoldCommand {
  return usePref(foldCommand);
}

export function foldsCollapsed(mode: FoldMode): boolean {
  return mode !== 'expandAll' && mode !== 'gitDefault';
}

export function wholeFileFor(mode: FoldMode): boolean | null {
  if (mode === 'default') return true;
  if (mode === 'gitDefault') return false;
  return null;
}

export function wholeFileWanted(): boolean {
  return foldCommand.read().wholeFile;
}
