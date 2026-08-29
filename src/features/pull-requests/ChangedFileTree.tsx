'use client';

import { ChangeCounts } from './ChangeCounts';
import { FileTreeRow } from './FileTreeRow';
import type { ChangedFile } from './pullRequests';

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
        <FileTreeRow
          key={file.filename}
          path={file.filename}
          selected={file.filename === selected}
          onSelect={() => onSelect(file.filename)}
        >
          <ChangeCounts additions={file.additions} deletions={file.deletions} />
        </FileTreeRow>
      ))}
    </>
  );
}
