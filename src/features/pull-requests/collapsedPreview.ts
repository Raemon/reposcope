import type { CollapseRegion } from './collapseRegions';
import { innerRows, textOf, type Side } from './foldSpan';
import type { DiffRow } from './splitDiff';

const MAX_CHARS = 400;

export function collapsedPreview(rows: DiffRow[], region: CollapseRegion, side: Side): string {
  let preview = '';
  for (const index of innerRows(region)) {
    const piece = previewPiece(rows[index], side);
    if (!piece) continue;
    preview = preview ? `${preview} ${piece}` : piece;
    if (preview.length > MAX_CHARS) return `${preview.slice(0, MAX_CHARS)}…`;
  }
  return preview;
}

function previewPiece(row: DiffRow | undefined, side: Side): string {
  if (!row || row.kind === 'hunk') return '';
  const text = textOf(row, side) ?? textOf(row, side === 'right' ? 'left' : 'right');
  return text?.trim() ?? '';
}
