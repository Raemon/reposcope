import type { ReactNode } from 'react';
import { HoverCardTrigger } from './HoverCard';

export function Chip({
  children,
  tone = 'dim',
  tip,
  tipLabel,
}: {
  children: ReactNode;
  tone?: 'dim' | 'accent' | 'plain';
  tip?: ReactNode;
  tipLabel?: string;
}) {
  const tones = {
    dim: 'border-btn-edge bg-btn text-ink-dim',
    accent: 'border-btn-edge bg-btn text-accent',
    plain: 'border-panel-edge bg-panel text-ink',
  };
  const body = (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-px font-mono text-[10px] leading-4 ${tones[tone]}`}>
      {children}
    </span>
  );
  if (tip === undefined) return body;
  return (
    <HoverCardTrigger label={tipLabel ?? ''} card={tip} className="cursor-default">
      {body}
    </HoverCardTrigger>
  );
}

export function MethodChip({ method }: { method: string }) {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE', 'MUTATION'].includes(method);
  return <Chip tone={mutating ? 'accent' : 'dim'}>{method}</Chip>;
}
