export interface DiffCell {
  line: number;
  text: string;
}

export interface DiffRow {
  kind: 'hunk' | 'context' | 'change';
  label: string;
  left: DiffCell | null;
  right: DiffCell | null;
}

export function splitDiff(patch: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let removed: DiffCell[] = [];
  let added: DiffCell[] = [];
  let oldLine = 0;
  let newLine = 0;

  const flush = () => {
    for (let index = 0; index < Math.max(removed.length, added.length); index += 1) {
      rows.push({ kind: 'change', label: '', left: removed[index] ?? null, right: added[index] ?? null });
    }
    removed = [];
    added = [];
  };

  for (const line of patch.split('\n')) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      flush();
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      rows.push({ kind: 'hunk', label: line, left: null, right: null });
    } else if (line.startsWith('+')) {
      added.push({ line: newLine++, text: line.slice(1) });
    } else if (line.startsWith('-')) {
      removed.push({ line: oldLine++, text: line.slice(1) });
    } else if (!line.startsWith('\\')) {
      flush();
      const text = line.slice(1);
      rows.push({
        kind: 'context',
        label: '',
        left: { line: oldLine++, text },
        right: { line: newLine++, text },
      });
    }
  }
  flush();
  return rows;
}
