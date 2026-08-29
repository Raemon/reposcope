'use client';

import { ChangeCounts } from './ChangeCounts';
import { useColumnNav } from './columnNav';
import { fileKindColor, splitExtension } from './fileKind';
import { baseName, folderOf } from './fileTree';
import type { ChangedFile } from './pullRequests';
import { rowShowsAccent, rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

const ROW = 'flex w-full items-baseline gap-1.5 py-[1px] pl-1.5 pr-1.5 text-left text-[11px] leading-4';
const DELETE_ICON =
  'absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-btn px-1 text-[10px] leading-4 text-ink-dim opacity-0 transition-opacity hover:bg-btn-hover hover:text-error-ink focus-visible:opacity-100 group-hover:opacity-100';

export function ChangedFileTree({
  files,
  selected,
  onSelect,
  onDelete,
}: {
  files: ChangedFile[];
  selected: string | null;
  onSelect: (filename: string) => void;
  onDelete: ((filename: string) => void) | null;
}) {
  return (
    <>
      {files.map((file) => (
        <FileRow key={file.filename} file={file} selected={selected} onSelect={onSelect} onDelete={onDelete} />
      ))}
    </>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
  onDelete,
}: {
  file: ChangedFile;
  selected: string | null;
  onSelect: (filename: string) => void;
  onDelete: ((filename: string) => void) | null;
}) {
  const row = useColumnNav('files').row(file.filename, file.filename === selected);
  return (
    <div className={`group relative ${rowStateClass(row.state)}`}>
      <SelectableRow {...row.props} onActivate={() => onSelect(file.filename)} className={ROW}>
        <span className="min-w-0 flex-1 truncate filename-text">
          <ParentFolder path={file.filename} />
          <FileName path={file.filename} tinted={!rowShowsAccent(row.state)} />
        </span>
        <ChangeCounts additions={file.additions} deletions={file.deletions} />
      </SelectableRow>
      {onDelete !== null && file.status !== 'removed' && <DeleteFileIcon file={file} onDelete={onDelete} />}
    </div>
  );
}

function DeleteFileIcon({ file, onDelete }: { file: ChangedFile; onDelete: (filename: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Delete ${file.filename}`}
      title={`Delete ${file.filename}`}
      onClick={() => onDelete(file.filename)}
      className={DELETE_ICON}
    >
      🗑
    </button>
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
