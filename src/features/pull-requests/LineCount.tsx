export function LineCount({ lines }: { lines: number | undefined }) {
  if (lines === undefined) return null;
  return <span className="shrink-0 text-[9px] leading-4 text-ink-dim">{lines.toLocaleString()}</span>;
}
