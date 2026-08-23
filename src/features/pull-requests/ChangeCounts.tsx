export function ChangeCounts({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className="shrink-0 text-[9px] leading-4">
      <span className="text-add-ink">+{additions}</span> <span className="text-del-ink">−{deletions}</span>
    </span>
  );
}
