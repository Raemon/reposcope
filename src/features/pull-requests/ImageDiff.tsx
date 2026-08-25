'use client';

import { useState } from 'react';
import { setDiffPaneWidth, useDiffPaneWidth } from './diffPaneWidth';
import { DragHandle, useDragWidth } from './ResizableColumn';
import { CheckerImg } from './BlobImage';
import { type ImageSource } from './imageView';
import { openImageTab } from './openImageTab';
import { useFileBlob } from './useFileBlob';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function ImageDiff({
  owner,
  repo,
  before,
  after,
}: {
  owner: string;
  repo: string;
  before: ImageSource | null;
  after: ImageSource | null;
}) {
  const beforeSize = { width: useDiffPaneWidth(), open: true };
  const startDrag = useDragWidth(beforeSize, setDiffPaneWidth);
  return (
    <div className="flex">
      <section
        className="relative flex shrink-0 flex-col border-r border-panel-edge"
        style={{ width: beforeSize.width }}
      >
        <ImagePane owner={owner} repo={repo} label="before" source={before} />
        <DragHandle onPointerDown={startDrag} />
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        <ImagePane owner={owner} repo={repo} label="after" source={after} />
      </section>
    </div>
  );
}

function ImagePane({
  owner,
  repo,
  label,
  source,
}: {
  owner: string;
  repo: string;
  label: string;
  source: ImageSource | null;
}) {
  const blob = useFileBlob(owner, repo, source);
  const [shape, setShape] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-baseline gap-2 px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-ink-dim">
        <span>{label}</span>
        {shape && <span className="tracking-normal normal-case">{shape}</span>}
        {blob.value && <span className="tracking-normal normal-case">{byteLabel(blob.value.byteSize)}</span>}
      </div>
      <div className="flex min-h-[80px] flex-1 items-center justify-center p-3">
        {!source ? (
          <PaneNote text={label === 'before' ? 'added in this change' : 'deleted in this change'} />
        ) : blob.error ? (
          <PaneNote text={blob.error} />
        ) : !blob.value ? (
          <PaneNote text="Loading…" />
        ) : !blob.value.dataUrl ? (
          <PaneNote text={`too large to preview (${byteLabel(blob.value.byteSize)})`} />
        ) : (
          <HoverCardTrigger label="Open image in a new tab" focusable={false} tooltipStyle>
            <button
              type="button"
              onClick={() => blob.value?.dataUrl && openImageTab(blob.value.dataUrl)}
              className="max-w-full cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <CheckerImg
                src={blob.value.dataUrl}
                alt={`${label} — ${source.path}`}
                onLoad={(event) => setShape(`${event.currentTarget.naturalWidth}×${event.currentTarget.naturalHeight}`)}
                className="max-h-[420px] max-w-full object-contain"
              />
            </button>
          </HoverCardTrigger>
        )}
      </div>
    </div>
  );
}

function PaneNote({ text }: { text: string }) {
  return <p className="text-[10px] text-ink-dim">{text}</p>;
}

function byteLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
