'use client';

import { createPortal } from 'react-dom';
import type { ReactNode, RefObject } from 'react';
import { GalleryImage } from './BlobImage';
import { baseName } from './fileTree';
import type { ChangedFile } from './pullRequests';
import type { ImageGallery } from './imageView';
import { holdClick, useFocusOnIndex, useViewerKeys, wrapImageIndex } from './viewerKeys';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

const SHIFT = 'shrink-0 px-2 py-8 text-[18px] leading-none text-ink-dim hover:bg-btn-hover hover:text-ink';

interface ViewerProps {
  gallery: ImageGallery;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}

export function ImageViewerModal(props: ViewerProps) {
  const file = props.gallery.files[props.index];
  useViewerKeys(props.index, props.gallery.files.length, props.onIndex, props.onClose);
  if (!file) return null;
  return createPortal(<ViewerDialog {...props} file={file} />, document.body);
}

function ViewerDialog({ gallery, file, index, onIndex, onClose }: ViewerProps & { file: ChangedFile }) {
  const dialog = useFocusOnIndex(index);
  return (
    <DialogShell dialog={dialog} label={file.filename} onClose={onClose}>
      <ViewerBody gallery={gallery} file={file} index={index} onIndex={onIndex} onClose={onClose} />
    </DialogShell>
  );
}

function DialogShell({
  dialog,
  label,
  onClose,
  children,
}: {
  dialog: RefObject<HTMLDivElement | null>;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 outline-none">
      {children}
    </div>
  );
}

function ViewerBody({ gallery, file, index, onIndex, onClose }: ViewerProps & { file: ChangedFile }) {
  const count = gallery.files.length;
  return (
    <div className="flex h-[90vh] w-[90vw] items-center gap-1">
      {shiftControl(-1, index, count, onIndex)}
      <ViewerStage gallery={gallery} file={file} index={index} onClose={onClose} />
      {shiftControl(1, index, count, onIndex)}
    </div>
  );
}

function ViewerStage({ gallery, file, index, onClose }: { gallery: ImageGallery; file: ChangedFile; index: number; onClose: () => void }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ViewerCaption file={file} index={index} count={gallery.files.length} onClose={onClose} />
      <ViewerPicture gallery={gallery} file={file} />
    </div>
  );
}

function ViewerPicture({ gallery, file }: { gallery: ImageGallery; file: ChangedFile }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <span onClick={holdClick} className="flex max-h-full min-h-0 max-w-full">
        <GalleryImage gallery={gallery} file={file} className="max-h-full max-w-full object-contain" />
      </span>
    </div>
  );
}

function ViewerCaption({ file, index, count, onClose }: { file: ChangedFile; index: number; count: number; onClose: () => void }) {
  return (
    <div onClick={holdClick} className="flex shrink-0 items-baseline gap-2 px-1 py-[2px] text-[11px] leading-4">
      <CaptionName path={file.filename} />
      <CaptionStatus status={file.status} />
      <CaptionIndex index={index} count={count} />
      <CloseViewer onClose={onClose} />
    </div>
  );
}

function CaptionName({ path }: { path: string }) {
  return (
    <HoverCardTrigger label={path} className="min-w-0 flex-1" focusable={false}>
      <span className="truncate text-ink">{baseName(path)}</span>
    </HoverCardTrigger>
  );
}

function CaptionStatus({ status }: { status: string }) {
  return <span className="shrink-0 uppercase tracking-[0.18em] text-ink-dim">{status}</span>;
}

function CaptionIndex({ index, count }: { index: number; count: number }) {
  return (
    <span className="shrink-0 text-ink-dim">
      {index + 1}/{count}
    </span>
  );
}

function CloseViewer({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} className="shrink-0 text-ink-dim hover:bg-btn-hover hover:text-ink">
      close
    </button>
  );
}

function shiftControl(delta: number, index: number, count: number, onIndex: (index: number) => void) {
  const back = delta < 0;
  return <ShiftButton label={back ? 'Previous image' : 'Next image'} mark={back ? '‹' : '›'} delta={delta} index={index} count={count} onIndex={onIndex} />;
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
    <button type="button" aria-label={label} onClick={(event) => shiftImage(event, index, delta, count, onIndex)} className={SHIFT}>
      {mark}
    </button>
  );
}

function shiftImage(
  event: { stopPropagation: () => void },
  index: number,
  delta: number,
  count: number,
  onIndex: (index: number) => void,
) {
  holdClick(event);
  onIndex(wrapImageIndex(index, delta, count));
}
