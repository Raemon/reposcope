'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { timeAgoShort } from './timeAgo';

export function RelativeTime({ iso, className = '' }: { iso: string; className?: string }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <span
      className={className}
      onMouseEnter={(event) => setAnchor(event.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {timeAgoShort(iso)}
      {anchor &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: anchor.left + anchor.width / 2, top: anchor.bottom + 6 }}
            className="fixed z-50 -translate-x-1/2 whitespace-nowrap rounded bg-tip px-1.5 py-0.5 text-[10px] leading-4 text-ink shadow-card"
          >
            {exactTime(iso)}
          </span>,
          document.body,
        )}
    </span>
  );
}

function exactTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
