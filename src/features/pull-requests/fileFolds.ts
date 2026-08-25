'use client';

import { useCallback, useMemo, useState } from 'react';
import { localPref } from './localPref';

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

const expandAllPref = localPref('reposcope.diffFolds', false, decodeExpanded);

export function useFileFolds(scope: string): FileFolds {
  const [folds, setFolds] = useState<FoldState>(() => preferredFolds(scope));
  if (folds.scope !== scope) setFolds(preferredFolds(scope));
  const toggle = useCallback((filename: string) => setFolds((was) => withFlipped(was, filename)), []);
  const setAll = useCallback((expanded: boolean) => {
    expandAllPref.set(expanded);
    setFolds((was) => allFiles(was.scope, expanded));
  }, []);
  return useMemo(() => ({ expanded: (filename) => isExpanded(folds, filename), toggle, setAll }), [folds, toggle, setAll]);
}

function isExpanded(folds: FoldState, filename: string): boolean {
  return folds.flipped.has(filename) ? !folds.everyFile : folds.everyFile;
}

function preferredFolds(scope: string): FoldState {
  return allFiles(scope, expandAllPref.read());
}

function decodeExpanded(stored: unknown): boolean | undefined {
  return typeof stored === 'boolean' ? stored : undefined;
}

function allFiles(scope: string, everyFile: boolean): FoldState {
  return { scope, everyFile, flipped: new Set() };
}

function withFlipped(folds: FoldState, filename: string): FoldState {
  const flipped = new Set(folds.flipped);
  if (!flipped.delete(filename)) flipped.add(filename);
  return { ...folds, flipped };
}
