'use client';

import { ChangedFileTree } from './ChangedFileTree';
import type { PreviewToken } from './ColumnPreview';
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

export function fileTokens(fileSet: ChangedFileSet | null, selected: string | null): PreviewToken[] {
  return (fileSet?.files ?? []).map((file) => {
    const name = file.filename.split('/').pop() ?? file.filename;
    return {
      key: file.filename,
      label: name.slice(0, 2),
      title: file.filename,
      accent: file.filename === selected,
    };
  });
}
