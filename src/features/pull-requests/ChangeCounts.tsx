const COUNT = 'shrink-0 text-[9px] leading-4';

export function ChangeCounts({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className={COUNT}>
      <span className="text-add-ink">+{additions}</span> <span className="text-del-ink">−{deletions}</span>
    </span>
  );
}

export function ChangeCountCells({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <>
      <span className={`${COUNT} text-add-ink`}>+{additions}</span>
      <span className={`${COUNT} text-del-ink`}>−{deletions}</span>
    </>
  );
}
