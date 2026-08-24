'use client';

import { useState } from 'react';
import { BlobImage } from './BlobImage';
import { ImageViewerModal } from './ImageViewerModal';
import { previewSource } from './imageView';
import type { ChangedFile } from './pullRequests';

export function ImageThumbnailStrip({
  owner,
  repo,
  files,
  baseRef,
  headRef,
}: {
  owner: string;
  repo: string;
  files: ChangedFile[];
  baseRef: string;
  headRef: string;
}) {
  const [viewer, setViewer] = useState<number | null>(null);
  return (
    <>
      <ThumbnailRow
        owner={owner}
        repo={repo}
        files={files}
        baseRef={baseRef}
        headRef={headRef}
        active={viewer}
        onOpen={setViewer}
      />
      {viewer !== null && (
        <ImageViewerModal
          owner={owner}
          repo={repo}
          files={files}
          baseRef={baseRef}
          headRef={headRef}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}

function ThumbnailRow({
  owner,
  repo,
  files,
  baseRef,
  headRef,
  active,
  onOpen,
}: {
  owner: string;
  repo: string;
  files: ChangedFile[];
  baseRef: string;
  headRef: string;
  active: number | null;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-panel-edge px-2 py-1">
      {files.map((file, index) => (
        <ImageThumb
          key={file.filename}
          owner={owner}
          repo={repo}
          file={file}
          baseRef={baseRef}
          headRef={headRef}
          active={index === active}
          onOpen={() => onOpen(index)}
        />
      ))}
    </div>
  );
}

function ImageThumb({
  owner,
  repo,
  file,
  baseRef,
  headRef,
  active,
  onOpen,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  active: boolean;
  onOpen: () => void;
}) {
  const source = previewSource(file, baseRef, headRef);
  return (
    <button
      type="button"
      title={file.filename}
      aria-label={file.filename}
      onClick={onOpen}
      className={`flex h-12 w-16 shrink-0 cursor-zoom-in items-center justify-center ${active ? 'bg-btn-active' : 'hover:bg-btn-hover'}`}
    >
      <BlobImage
        owner={owner}
        repo={repo}
        source={source}
        alt={file.filename}
        compact
        className="max-h-12 max-w-16 object-contain"
      />
    </button>
  );
}
