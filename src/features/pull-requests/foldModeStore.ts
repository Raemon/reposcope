'use client';

import { useSyncExternalStore } from 'react';

export type FoldMode = 'default' | 'expandAll' | 'collapseAll' | 'collapseUnchanged';

export interface FoldCommand {
  mode: FoldMode;
  epoch: number;
}

let command: FoldCommand = { mode: 'default', epoch: 0 };
const listeners = new Set<() => void>();

export function applyFoldMode(mode: FoldMode): void {
  command = { mode, epoch: command.epoch + 1 };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(): FoldCommand {
  return command;
}

export function useFoldCommand(): FoldCommand {
  return useSyncExternalStore(subscribe, read, read);
}
