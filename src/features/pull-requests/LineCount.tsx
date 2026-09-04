import { COUNT_CELL } from './ChangeCounts';

export function LineCount({ lines }: { lines: number | undefined }) {
  if (lines === undefined) return null;
  return <span className={`${COUNT_CELL} text-ink-dim`}>{lines.toLocaleString()}</span>;
}
