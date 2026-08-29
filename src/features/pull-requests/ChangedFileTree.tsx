'use client';

import { ChangeCounts } from './ChangeCounts';
import { useDiffSort } from './diffSortStore';
import { FileTreeRow } from './FileTreeRow';
import { FolderGroupedRows } from './FolderGroupedRows';
import type { ChangedFile } from './pullRequests';

const DELETE_ICON =
  'absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-btn px-1 text-[10px] leading-4 text-ink-dim opacity-0 transition-opacity hover:bg-btn-hover hover:text-error-ink focus-visible:opacity-100 group-hover:opacity-100';

interface RowProps {
  selected: string | null;
  onSelect: (filename: string) => void;
  onDelete: ((filename: string) => void) | null;
}

export function ChangedFileTree({ files, ...row }: RowProps & { files: ChangedFile[] }) {
  const grouped = useDiffSort() === 'folder';
  if (grouped) return <GroupedRows files={files} {...row} />;
  return <>{files.map((file) => <ChangedFileRow key={file.filename} file={file} indented={false} {...row} />)}</>;
}

function GroupedRows({ files, ...row }: RowProps & { files: ChangedFile[] }) {
  return (
    <FolderGroupedRows items={files} pathOf={(file) => file.filename}>
      {(file, indented) => <ChangedFileRow key={file.filename} file={file} indented={indented} {...row} />}
    </FolderGroupedRows>
  );
}

function ChangedFileRow({ file, indented, selected, onSelect, onDelete }: RowProps & { file: ChangedFile; indented: boolean }) {
  return (
    <FileTreeRow
      path={file.filename}
      selected={file.filename === selected}
      onSelect={() => onSelect(file.filename)}
      indented={indented}
      action={deleteIconFor(file, onDelete)}
    >
      <ChangeCounts additions={file.additions} deletions={file.deletions} />
    </FileTreeRow>
  );
}

function deleteIconFor(file: ChangedFile, onDelete: ((filename: string) => void) | null) {
  if (onDelete === null || file.status === 'removed') return null;
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
