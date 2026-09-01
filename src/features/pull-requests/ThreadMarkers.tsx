'use client';

import { useEffect, useState } from 'react';
import { placeThreads, type AnchoredThread } from './commentAnchors';
import { isDraftThread } from './draftThread';
import { clearDraftThread } from './draftThreadStore';
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
  const [picked, setPicked] = useState<ReviewThread | null>(null);
  const markers = placeThreads(anchors, {}, MARKER_GAP, MARKER);
  const opened = anchors.find(({ thread }) => isDraftThread(thread))?.thread ?? picked;

  useEffect(() => onOverflow(0), [onOverflow]);

  return (
    <div className="relative shrink-0 border-l border-panel-edge bg-shade" style={{ width: MARKER + MARKER_GAP * 2 }}>
      {markers.map((marker) => (
        <MarkerButton key={marker.thread.rootId} top={marker.top} thread={marker.thread} onOpen={setPicked} />
      ))}
      {opened && (
        <ModalShell label={threadLabel(opened)} dismissable onDismiss={() => dismissThread(setPicked)}>
          <ThreadCard thread={opened} />
        </ModalShell>
      )}
    </div>
  );
}

function dismissThread(setPicked: (thread: ReviewThread | null) => void) {
  clearDraftThread();
  setPicked(null);
}

function MarkerButton({
  top,
  thread,
  onOpen,
}: {
  top: number;
  thread: ReviewThread;
  onOpen: (thread: ReviewThread) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(thread)}
      aria-label={threadLabel(thread)}
      style={{ top, width: MARKER, height: MARKER }}
      className="absolute left-[2px] flex items-center justify-center rounded border border-panel-edge bg-tip text-ink-dim"
    >
      <CommentIcon />
    </button>
  );
}

function threadLabel(thread: ReviewThread): string {
  return thread.line === null ? 'Comment' : `Comment on line ${thread.line}`;
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M4 5.5h16v11H12l-5 4v-4H4z" strokeLinejoin="round" />
    </svg>
  );
}
