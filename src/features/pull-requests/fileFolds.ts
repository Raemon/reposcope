'use client';

import { useCallback, useMemo, useState } from 'react';

export interface FileFolds {
  expanded: (filename: string) => boolean;
  toggle: (filename: string) => void;
  setAll: (expanded: boolean) => void;
}

interface FoldState {
  scope: string;
  everyFile: boolean;
  flipped: ReadonlySet<string>;
}

export function useFileFolds(scope: string): FileFolds {
  const [folds, setFolds] = useState<FoldState>(() => collapsedFolds(scope));
  if (folds.scope !== scope) setFolds(collapsedFolds(scope));
  const toggle = useCallback((filename: string) => setFolds((was) => withFlipped(was, filename)), []);
  const setAll = useCallback((expanded: boolean) => setFolds((was) => allFiles(was.scope, expanded)), []);
  return useMemo(() => ({ expanded: (filename) => isExpanded(folds, filename), toggle, setAll }), [folds, toggle, setAll]);
}

function isExpanded(folds: FoldState, filename: string): boolean {
  return folds.flipped.has(filename) ? !folds.everyFile : folds.everyFile;
}

function collapsedFolds(scope: string): FoldState {
  return allFiles(scope, false);
}

function allFiles(scope: string, everyFile: boolean): FoldState {
  return { scope, everyFile, flipped: new Set() };
}

function withFlipped(folds: FoldState, filename: string): FoldState {
  const flipped = new Set(folds.flipped);
  if (!flipped.delete(filename)) flipped.add(filename);
  return { ...folds, flipped };
}
