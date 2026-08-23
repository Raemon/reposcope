import { HoverCardTrigger } from './HoverCard';

export interface MeterSegment {
  label: string;
  value: number;
  detail?: string;
}

const SEGMENT_SHADES = ['bg-meter-1', 'bg-meter-2', 'bg-meter-3', 'bg-meter-4', 'bg-meter-5', 'bg-meter-6'];

export function MeterBar({ segments, width = 'w-48' }: { segments: MeterSegment[]; width?: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;
  return (
    <span className={`inline-flex h-2 ${width} overflow-hidden rounded-sm border border-btn-edge align-middle`}>
      {segments.map((segment, at) => (
        <span
          key={segment.label}
          className="flex h-full"
          style={{ width: `${Math.max(1.5, (segment.value / total) * 100)}%` }}
        >
          <HoverCardTrigger
            label={segment.label}
            card={<p className="text-[11px] text-ink">{segment.detail ?? `${segment.value} of ${total}`}</p>}
            className="h-full w-full"
          >
            <span className={`block h-full w-full ${SEGMENT_SHADES[Math.min(at, SEGMENT_SHADES.length - 1)]}`} />
          </HoverCardTrigger>
        </span>
      ))}
    </span>
  );
}
