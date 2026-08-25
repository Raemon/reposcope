'use client';

import { ChangedFileTree } from './ChangedFileTree';
import type { PreviewToken } from './ColumnPreview';
import { sortByFolder } from './fileTree';
import type { ChangedFile, ChangedFileSet } from './pullRequests';

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

export function orderedFiles(fileSet: ChangedFileSet | null): ChangedFile[] {
  return sortByFolder(fileSet?.files ?? []);
}

export function fileTokens(fileSet: ChangedFileSet | null, selected: string | null): PreviewToken[] {
  return orderedFiles(fileSet).map((file) => {
    const name = file.filename.split('/').pop() ?? file.filename;
    return {
      key: file.filename,
      label: name.slice(0, 2),
      title: file.filename,
      accent: file.filename === selected,
    };
  });
}
