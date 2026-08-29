import type { DiffRow } from './splitDiff';

export function splitLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function expandDiff(rows: DiffRow[], baseLines: string[], headLines: string[]): DiffRow[] {
  const expanded: DiffRow[] = [];
  let oldLine = 1;
  let newLine = 1;

  const fillUntil = (untilOld: number, untilNew: number) => {
    while (oldLine < untilOld && newLine < untilNew && oldLine <= baseLines.length && newLine <= headLines.length) {
      expanded.push({
        kind: 'context',
        label: '',
        left: { line: oldLine, text: baseLines[oldLine - 1] ?? '' },
        right: { line: newLine, text: headLines[newLine - 1] ?? '' },
      });
      oldLine += 1;
      newLine += 1;
    }
  };

  for (const row of rows) {
    if (row.kind === 'hunk') {
      const start = hunkStart(row.label);
      if (start) fillUntil(start.old, start.new);
      continue;
    }
    expanded.push(row);
    if (row.left) oldLine = row.left.line + 1;
    if (row.right) newLine = row.right.line + 1;
  }
  fillUntil(baseLines.length + 1, headLines.length + 1);
  return expanded;
}

function hunkStart(label: string): { old: number; new: number } | null {
  const match = label.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  return match ? { old: Number(match[1]), new: Number(match[2]) } : null;
}
