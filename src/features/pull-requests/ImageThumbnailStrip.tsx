'use client';

import { useEffect, useState } from 'react';
import { FilePreview } from './BlobImage';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { ImageViewerModal } from './ImageViewerModal';
import type { ChangedFile } from './pullRequests';
import type { ImageGallery } from './imageView';

const THUMB = 'flex h-12 w-16 shrink-0 cursor-zoom-in items-center justify-center';

export function ImageThumbnailStrip(gallery: ImageGallery) {
  const { index, setIndex } = useViewerIndex(gallery.baseRef, gallery.headRef);
  return (
    <>
      <ThumbnailRow gallery={gallery} active={index} onOpen={setIndex} />
      {index !== null && index < gallery.files.length && (
        <ImageViewerModal gallery={gallery} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
      )}
    </>
  );
}

function useViewerIndex(baseRef: string, headRef: string) {
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => setIndex(null), [baseRef, headRef]);
  return { index, setIndex };
}

function ThumbnailRow({
  gallery,
  active,
  onOpen,
}: {
  gallery: ImageGallery;
  active: number | null;
  onOpen: (index: number) => void;
}) {
  return <div className="flex items-center gap-1 overflow-x-auto border-b border-panel-edge px-2 py-1">{thumbButtons(gallery, active, onOpen)}</div>;
}

function thumbButtons(gallery: ImageGallery, active: number | null, onOpen: (index: number) => void) {
  return gallery.files.map((file, index) => (
    <ImageThumb key={file.filename} gallery={gallery} file={file} active={index === active} onOpen={() => onOpen(index)} />
  ));
}

function ImageThumb({
  gallery,
  file,
  active,
  onOpen,
}: {
  gallery: ImageGallery;
  file: ChangedFile;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <HoverCardTrigger label={file.filename} placement="below" width="wide" interactive={false} card={<ThumbPreviewCard gallery={gallery} file={file} />}>
      <button type="button" aria-label={file.filename} onClick={onOpen} className={thumbClass(active)}>
        <FilePreview owner={gallery.owner} repo={gallery.repo} file={file} baseRef={gallery.baseRef} headRef={gallery.headRef} compact className="max-h-12 max-w-16 object-contain" />
      </button>
    </HoverCardTrigger>
  );
}

function ThumbPreviewCard({ gallery, file }: { gallery: ImageGallery; file: ChangedFile }) {
  return (
    <span className="flex items-center justify-center">
      <FilePreview owner={gallery.owner} repo={gallery.repo} file={file} baseRef={gallery.baseRef} headRef={gallery.headRef} className="max-h-[60vh] max-w-full object-contain" />
    </span>
  );
}

function thumbClass(active: boolean): string {
  return `${THUMB} ${active ? 'bg-btn-active' : 'hover:bg-btn-hover'}`;
}
