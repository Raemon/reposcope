'use client';

import { useColumnNav } from './columnNav';
import { folderKey } from './fileTreeNodes';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1 py-[1px] pr-1.5 text-left text-[11px] leading-4';

export function FolderTreeRow({
  path,
  name,
  indent,
  open,
  selected,
  onActivate,
}: {
  path: string;
  name: string;
  indent: number;
  open: boolean;
  selected: boolean;
  onActivate: () => void;
}) {
  const row = useColumnNav('files').row(folderKey(path), selected);
  return (
    <SelectableRow
      {...row.props}
      onActivate={onActivate}
      expanded={open}
      label={`${open ? 'Collapse' : 'Expand'} ${path}`}
      style={{ paddingLeft: indent }}
      className={`${ROW} ${rowStateClass(row.state)}`}
    >
      <span className="w-2 shrink-0 text-ink-dim">{open ? '▾' : '▸'}</span>
      <span className="min-w-0 flex-1 truncate text-ink-dim">{name}/</span>
    </SelectableRow>
  );
}
