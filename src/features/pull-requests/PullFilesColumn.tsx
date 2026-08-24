'use client';

import { ChangedFileTree } from './ChangedFileTree';
import type { ChangedFileSet } from './pullRequests';

export function PullFilesColumn({
  fileSet,
  fileError,
  path,
  onSelect,
}: {
  fileSet: ChangedFileSet | null;
  fileError: string | null;
  path: string | null;
  onSelect: (filename: string) => void;
}) {
  if (fileSet === null) {
    return (
      <p className={`px-1.5 py-[1px] text-[11px] leading-4 ${fileError ? 'text-error-ink' : 'text-ink-dim'}`}>
        {fileError ?? 'Loading…'}
      </p>
    );
  }
  return <ChangedFileTree files={fileSet.files} selected={path} onSelect={onSelect} />;
}
