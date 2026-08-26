type Counts = { additions: number; deletions: number };

export function ChangeCounts(counts: Counts) {
  return (
    <span className="flex shrink-0 gap-x-1 text-[9px] leading-4">
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
