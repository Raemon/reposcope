'use client';

import { ChangedFileTree } from './ChangedFileTree';
import type { PreviewToken } from './ColumnPreview';
import { baseName } from './fileTree';
import type { ChangedFile } from './pullRequests';

export function PullFilesColumn({
  files,
  fileError,
  path,
  onSelect,
}: {
  files: ChangedFile[] | null;
  fileError: string | null;
  path: string | null;
  onSelect: (filename: string) => void;
}) {
  if (files === null) {
    return (
      <p className={`px-1.5 py-[1px] text-[11px] leading-4 ${fileError ? 'text-error-ink' : 'text-ink-dim'}`}>
        {fileError ?? 'Loading…'}
      </p>
    );
  }
  return <ChangedFileTree files={files} selected={path} onSelect={onSelect} />;
}

export function fileTokens(files: ChangedFile[], selected: string | null): PreviewToken[] {
  return files.map((file) => {
    return {
      key: file.filename,
      label: baseName(file.filename).slice(0, 2),
      title: file.filename,
      accent: file.filename === selected,
    };
  });
}
