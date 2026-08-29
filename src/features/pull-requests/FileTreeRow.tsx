'use client';

import type { ReactNode } from 'react';
import { useColumnNav } from './columnNav';
import { fileKindColor, splitExtension } from './fileKind';
import { baseName, folderOf } from './fileTree';
import { rowShowsAccent, rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 py-[1px] pr-1.5 text-left text-[11px] leading-4';

export function FileTreeRow({
  path,
  navKey = path,
  selected,
  onSelect,
  indented = false,
  action = null,
  children,
}: {
  path: string;
  navKey?: string;
  selected: boolean;
  onSelect: () => void;
  indented?: boolean;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const row = useColumnNav('files').row(navKey, selected);
  const button = (
    <SelectableRow
      {...row.props}
      onActivate={onSelect}
      className={`${ROW} ${indented ? 'pl-4' : 'pl-1.5'} ${action === null ? rowStateClass(row.state) : ''}`}
    >
      <span className="min-w-0 flex-1 truncate filename-text">
        {!indented && <ParentFolder path={path} />}
        <FileName path={path} tinted={!rowShowsAccent(row.state)} />
      </span>
      {children}
    </SelectableRow>
  );
  if (action === null) return button;
  return (
    <div className={`group relative ${rowStateClass(row.state)}`}>
      {button}
      {action}
    </div>
  );
}

function ParentFolder({ path }: { path: string }) {
  const parent = baseName(folderOf(path));
  if (!parent) return null;
  return <span className="text-ink-dim opacity-50">{parent}/</span>;
}

function FileName({ path, tinted }: { path: string; tinted: boolean }) {
  const [stem, extension] = splitExtension(baseName(path));
  const color = tinted ? fileKindColor(path) : undefined;
  return (
    <>
      {stem}
      <span style={color ? { color } : undefined}>{extension}</span>
    </>
  );
}
