'use client';

import { useCallback, useMemo, useState } from 'react';

export interface FileFolds {
  expanded: (filename: string) => boolean;
  toggle: (filename: string) => void;
  setAll: (expanded: boolean) => void;
  allExpanded: boolean;
}

export function useFileFolds(): FileFolds {
  const [everyFile, setEveryFile] = useState(false);
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback((filename: string) => setFlipped((was) => withToggled(was, filename)), []);
  const setAll = useCallback((expanded: boolean) => {
    setEveryFile(expanded);
    setFlipped(new Set());
  }, []);
  return useMemo(
    () => ({ expanded: (filename) => flipped.has(filename) !== everyFile, toggle, setAll, allExpanded: everyFile }),
    [everyFile, flipped, toggle, setAll],
  );
}

function withToggled(files: ReadonlySet<string>, filename: string): ReadonlySet<string> {
  const next = new Set(files);
  if (!next.delete(filename)) next.add(filename);
  return next;
}
