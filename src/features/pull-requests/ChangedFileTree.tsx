'use client';

import { ChangeCounts } from './ChangeCounts';
import { useColumnNav } from './columnNav';
import { FILENAME_TEXT, fileKindColor, splitExtension } from './fileKind';
import { baseName, folderOf } from './fileTree';
import type { ChangedFile } from './pullRequests';
import { rowShowsAccent, rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 py-[1px] pl-1.5 pr-1.5 text-left text-[11px] leading-4';

export function ChangedFileTree({
  files,
  selected,
  onSelect,
}: {
  files: ChangedFile[];
  selected: string | null;
  onSelect: (filename: string) => void;
}) {
  return (
    <>
      {files.map((file) => (
        <FileRow key={file.filename} file={file} selected={selected} onSelect={onSelect} />
      ))}
    </>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
}: {
  file: ChangedFile;
  selected: string | null;
  onSelect: (filename: string) => void;
}) {
  const row = useColumnNav('files').row(file.filename, file.filename === selected);
  return (
    <SelectableRow
      {...row.props}
      onActivate={() => onSelect(file.filename)}
      className={`${ROW} ${rowStateClass(row.state)}`}
    >
      <span className={`min-w-0 flex-1 truncate ${FILENAME_TEXT}`}>
        <ParentFolder path={file.filename} />
        <FileName path={file.filename} tinted={!rowShowsAccent(row.state)} />
      </span>
      <ChangeCounts additions={file.additions} deletions={file.deletions} />
    </SelectableRow>
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
