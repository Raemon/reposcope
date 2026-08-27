'use client';

import { useSheetRows } from './centralLayout';

type Counts = { additions: number; deletions: number };

const RAIL = 'grid shrink-0 grid-cols-[5ch_5ch] justify-items-end gap-x-2 text-meta';

export function ChangeCounts(counts: Counts) {
  const wide = useSheetRows();
  return (
    <span className={wide ? RAIL : 'flex shrink-0 gap-x-2 text-meta'}>
      <ChangeCountCells {...counts} />
    </span>
  );
}

export function ChangeCountCells({ additions, deletions }: Counts) {
  return (
    <>
      <span className="text-add-ink">+{additions}</span>
      <span className="text-del-ink">−{deletions}</span>
    </>
  );
}
