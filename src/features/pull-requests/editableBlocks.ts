import type { DiffRow } from './splitDiff';

export interface EditableBlock {
  firstRow: number;
  lastRow: number;
  startLine: number;
  endLine: number;
  caretLine: number;
  text: string;
}

export function editableBlockAt(rows: DiffRow[], index: number): EditableBlock | null {
  if (!withinHunk(rows[index])) return null;
  let firstRow = index;
  let lastRow = index;
  while (withinHunk(rows[firstRow - 1])) firstRow -= 1;
  while (withinHunk(rows[lastRow + 1])) lastRow += 1;
  const cells = rows.slice(firstRow, lastRow + 1).flatMap((row) => (row.right ? [row.right] : []));
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (!first || !last) return null;
  return {
    firstRow,
    lastRow,
    startLine: first.line,
    endLine: last.line,
    caretLine: rows.slice(firstRow, index).filter((row) => row.right).length,
    text: cells.map((cell) => cell.text.replace(/\r$/, '')).join('\n'),
  };
}

function withinHunk(row: DiffRow | undefined): boolean {
  return row !== undefined && row.kind !== 'hunk';
}

export function changedCharacters(before: string, after: string): { removed: string; added: string } {
  const was = [...before];
  const now = [...after];
  let start = 0;
  while (start < was.length && start < now.length && was[start] === now[start]) start += 1;
  let end = 0;
  while (
    end < was.length - start &&
    end < now.length - start &&
    was[was.length - 1 - end] === now[now.length - 1 - end]
  ) {
    end += 1;
  }
  return { removed: was.slice(start, was.length - end).join(''), added: now.slice(start, now.length - end).join('') };
}

const MESSAGE_SNIPPET = 60;

export function commitMessageFor(pull: { title: string; number: number }, before: string, after: string): string {
  const { removed, added } = changedCharacters(before, after);
  const title = pull.title.replace(/\s+/g, ' ').trim();
  return `Minor change to ${title} (#${pull.number}): ${snippet(removed)} -> ${snippet(added)}`;
}

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat === '') return '(nothing)';
  return flat.length > MESSAGE_SNIPPET ? `${flat.slice(0, MESSAGE_SNIPPET - 1)}…` : flat;
}
