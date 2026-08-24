'use client';

import { CHECKERBOARD, type ImageSource } from './imageView';
import { useFileBlob } from './useFileBlob';

export function BlobImage({
  owner,
  repo,
  source,
  alt,
  className,
  compact = false,
}: {
  owner: string;
  repo: string;
  source: ImageSource;
  alt: string;
  className: string;
  compact?: boolean;
}) {
  const blob = useFileBlob(owner, repo, source);
  if (!blob.value?.dataUrl) return <p className="text-[9px] text-ink-dim">{blobStatus(blob, compact)}</p>;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blob.value.dataUrl} alt={alt} style={CHECKERBOARD} className={className} />
    </>
  );
}

function blobStatus(blob: { error: string | null; value: { dataUrl: string | null } | null }, compact: boolean): string {
  if (blob.error) return compact ? '!' : blob.error;
  if (!blob.value) return compact ? '…' : 'Loading…';
  return compact ? 'big' : 'too large to preview';
}
