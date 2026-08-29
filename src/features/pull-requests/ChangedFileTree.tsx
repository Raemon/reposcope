'use client';

import { ChangeCounts } from './ChangeCounts';
import { FileTreeRow } from './FileTreeRow';
import type { ChangedFile } from './pullRequests';

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
        <FileTreeRow
          key={file.filename}
          path={file.filename}
          selected={file.filename === selected}
          onSelect={() => onSelect(file.filename)}
          action={deleteIconFor(file, onDelete)}
        >
          <ChangeCounts additions={file.additions} deletions={file.deletions} />
        </FileTreeRow>
      ))}
    </>
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
