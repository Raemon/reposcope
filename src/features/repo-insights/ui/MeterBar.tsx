import { HoverCardTrigger } from '@/features/api-surface/HoverCard';

export interface MeterSegment {
  label: string;
  value: number;
  detail?: string;
}

const SEGMENT_SHADES = ['#9a6300', '#b98a3d', '#cfae77', '#dfc9a3', '#e9dcc4', '#f0e8d8'];

export function MeterBar({ segments, width = 'w-48' }: { segments: MeterSegment[]; width?: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;
  return (
    <span className={`inline-flex h-2 ${width} overflow-hidden rounded-sm border border-btn-edge align-middle`}>
      {segments.map((segment, at) => (
        <HoverCardTrigger
          key={segment.label}
          label={segment.label}
          card={<p className="text-[11px] text-ink">{segment.detail ?? `${segment.value} of ${total}`}</p>}
          className="h-full"
        >
          <span
            className="block h-full"
            style={{
              width: `${Math.max(1.5, (segment.value / total) * 100)}%`,
              backgroundColor: SEGMENT_SHADES[Math.min(at, SEGMENT_SHADES.length - 1)],
            }}
          />
        </HoverCardTrigger>
      ))}
    </span>
  );
}
