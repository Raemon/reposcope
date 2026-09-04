'use client';

import { useWorkingSubjects } from './workingSubjects';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function WorkingSparkle({ subject }: { subject: string }) {
  if (!useWorkingSubjects().has(subject)) return null;
  return (
    <HoverCardTrigger label="An AI agent is working on this pull request" focusable={false} tooltipStyle>
      <span aria-label="AI agent working" className="animate-pulse font-mono text-[11px] leading-none text-accent">
        ✳
      </span>
    </HoverCardTrigger>
  );
}
