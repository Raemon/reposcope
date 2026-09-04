'use client';

import { useEffect, useState } from 'react';
import { placeThreads, type AnchoredThread } from './commentAnchors';
import { rowLighting } from './litRow';
import type { ReviewThread } from './reviewThreads';
import { ThreadCard } from './ThreadCard';
import { ModalShell } from '@/features/surface-ui/ModalShell';

const MARKER = 14;
const MARKER_GAP = 2;

export function ThreadMarkers({
  anchors,
  onOverflow,
}: {
  anchors: AnchoredThread[];
  onOverflow: (pixels: number) => void;
}) {
  const [opened, setOpened] = useState<ReviewThread | null>(null);
  const markers = placeThreads(anchors, {}, MARKER_GAP, MARKER);

  useEffect(() => onOverflow(0), [onOverflow]);

  return (
    <div className="relative shrink-0 border-l border-panel-edge bg-shade" style={{ width: MARKER + MARKER_GAP * 2 }}>
      {markers.map((marker) => (
        <MarkerButton key={marker.thread.rootId} row={marker.row} top={marker.top} thread={marker.thread} onOpen={setOpened} />
      ))}
      {opened && (
        <ModalShell label={threadLabel(opened)} dismissable onDismiss={() => setOpened(null)}>
          <ThreadCard thread={opened} />
        </ModalShell>
      )}
    </div>
  );
}

function MarkerButton({
  row,
  top,
  thread,
  onOpen,
}: {
  row: number;
  top: number;
  thread: ReviewThread;
  onOpen: (thread: ReviewThread) => void;
}) {
  const count = thread.comments.length;
  return (
    <button
      type="button"
      {...rowLighting(row)}
      onClick={() => onOpen(thread)}
      aria-label={markerLabel(thread)}
      style={{ top, width: MARKER, height: MARKER }}
      className={`absolute left-[2px] flex items-center justify-center rounded border border-panel-edge bg-tip text-ink-dim hover:bg-btn-hover hover:text-ink ${thread.resolved ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      {count > 1 ? <span className="text-[9px] leading-none">{count}</span> : <CommentIcon />}
    </button>
  );
}

function threadLabel(thread: ReviewThread): string {
  return thread.line === null ? 'Comment' : `Comment on line ${thread.line}`;
}

function markerLabel(thread: ReviewThread): string {
  const count = thread.comments.length > 1 ? `, ${thread.comments.length} comments` : '';
  return `${threadLabel(thread)}${thread.resolved ? ', resolved' : ''}${count}`;
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M4 5.5h16v11H12l-5 4v-4H4z" strokeLinejoin="round" />
    </svg>
  );
}
