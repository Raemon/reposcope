'use client';

import { ChangedFileTree } from './ChangedFileTree';
import type { PreviewToken } from './ColumnPreview';
import { baseName } from './fileTree';
import type { ChangedFile } from './pullRequests';
import { Note } from '@/features/surface-ui/Note';

export function PullFilesColumn({
  files,
  fileError,
  path,
  onSelect,
  onDelete,
}: {
  files: ChangedFile[] | null;
  fileError: string | null;
  path: string | null;
  onSelect: (filename: string) => void;
  onDelete: ((filename: string) => void) | null;
}) {
  if (files === null) return <Note tone={fileError ? 'error' : 'dim'}>{fileError ?? 'Loading…'}</Note>;
  if (files.length === 0) return <Note tone="dim">No files changed.</Note>;
  return <ChangedFileTree files={files} selected={path} onSelect={onSelect} onDelete={onDelete} />;
}

export function fileTokens(files: ChangedFile[], selected: string | null): PreviewToken[] {
  return files.map((file) => ({
    key: file.filename,
    label: baseName(file.filename).slice(0, 2),
    title: file.filename,
    accent: file.filename === selected,
    serif: true,
  }));
}
