'use client';

import { HoverCardTrigger } from './HoverCard';
import { timeAgoShort } from './timeAgo';

export function RelativeTime({ iso, className = '' }: { iso: string; className?: string }) {
  return (
    <HoverCardTrigger label={exactTime(iso)} className={className} placement="below" focusable={false} tooltipStyle>
      {timeAgoShort(iso)}
    </HoverCardTrigger>
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
