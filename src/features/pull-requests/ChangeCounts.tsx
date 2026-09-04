type Counts = { additions: number; deletions: number };

export const COUNT_CELL = 'shrink-0 text-[9px] leading-4';

export function ChangeCounts(counts: Counts) {
  return (
    <span className={`${COUNT_CELL} flex gap-x-1`}>
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
