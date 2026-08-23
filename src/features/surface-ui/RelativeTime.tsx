'use client';

import { Tooltip } from './Tooltip';
import { timeAgoShort } from '@/features/repo-insights/ui/timeAgo';

export function RelativeTime({ iso, className = '' }: { iso: string; className?: string }) {
  return (
    <Tooltip variant="plain" tip={exactTime(iso)} className={className}>
      {timeAgoShort(iso)}
    </Tooltip>
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
