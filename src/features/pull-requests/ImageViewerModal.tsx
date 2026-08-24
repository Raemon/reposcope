'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BlobImage } from './BlobImage';
import { baseName } from './fileTree';
import { previewSource, wrapImageIndex } from './imageView';
import type { ChangedFile } from './pullRequests';

export function ImageViewerModal({
  owner,
  repo,
  files,
  baseRef,
  headRef,
  index,
  onIndex,
  onClose,
}: {
  owner: string;
  repo: string;
  files: ChangedFile[];
  baseRef: string;
  headRef: string;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const file = files[index];
  useViewerKeys(index, files.length, onIndex, onClose);
  if (!file) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95" onClick={onClose} role="presentation">
      <ViewerFrame
        owner={owner}
        repo={repo}
        file={file}
        baseRef={baseRef}
        headRef={headRef}
        index={index}
        count={files.length}
        onIndex={onIndex}
        onClose={onClose}
      />
    </div>,
    document.body,
  );
}

function ViewerFrame({
  owner,
  repo,
  file,
  baseRef,
  headRef,
  index,
  count,
  onIndex,
  onClose,
}: {
  owner: string;
  repo: string;
  file: ChangedFile;
  baseRef: string;
  headRef: string;
  index: number;
  count: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
  }, [index]);
  const source = previewSource(file, baseRef, headRef);
  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={file.filename}
      tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
      className="flex h-[90vh] w-[90vw] items-center gap-1 outline-none"
    >
      <ShiftButton label="Previous image" mark="‹" delta={-1} index={index} count={count} onIndex={onIndex} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ViewerCaption file={file} index={index} count={count} onClose={onClose} />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <BlobImage
            owner={owner}
            repo={repo}
            source={source}
            alt={file.filename}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
      <ShiftButton label="Next image" mark="›" delta={1} index={index} count={count} onIndex={onIndex} />
    </div>
  );
}

function ViewerCaption({
  file,
  index,
  count,
  onClose,
}: {
  file: ChangedFile;
  index: number;
  count: number;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-baseline gap-2 px-1 py-[2px] text-[11px] leading-4">
      <span title={file.filename} className="min-w-0 flex-1 truncate text-ink">
        {baseName(file.filename)}
      </span>
      <span className="shrink-0 uppercase tracking-[0.18em] text-ink-dim">{file.status}</span>
      <span className="shrink-0 text-ink-dim">
        {index + 1}/{count}
      </span>
      <button type="button" onClick={onClose} className="shrink-0 text-ink-dim hover:bg-btn-hover hover:text-ink">
        close
      </button>
    </div>
  );
}

function ShiftButton({
  label,
  mark,
  delta,
  index,
  count,
  onIndex,
}: {
  label: string;
  mark: string;
  delta: number;
  index: number;
  count: number;
  onIndex: (index: number) => void;
}) {
  if (count < 2) return null;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onIndex(wrapImageIndex(index, delta, count))}
      className="shrink-0 px-2 py-8 text-[18px] leading-none text-ink-dim hover:bg-btn-hover hover:text-ink"
    >
      {mark}
    </button>
  );
}

function useViewerKeys(
  index: number,
  count: number,
  onIndex: (index: number) => void,
  onClose: () => void,
) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = viewerKeyAction(event.key, index, count);
      if (!action) return;
      event.preventDefault();
      if (action.close) onClose();
      else onIndex(action.index);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onIndex, onClose]);
}

function viewerKeyAction(
  key: string,
  index: number,
  count: number,
): { close: true; index?: undefined } | { close?: undefined; index: number } | null {
  if (key === 'Escape') return { close: true };
  if (key === 'ArrowLeft') return { index: wrapImageIndex(index, -1, count) };
  if (key === 'ArrowRight') return { index: wrapImageIndex(index, 1, count) };
  return null;
}
