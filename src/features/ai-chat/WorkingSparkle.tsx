'use client';

import { SparkleIcon } from './SparkleIcon';
import { useWorkingSubjects } from './workingSubjects';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function WorkingSparkle({ subject }: { subject: string }) {
  if (!useWorkingSubjects().has(subject)) return null;
  return (
    <HoverCardTrigger label="An AI agent is working on this pull request" focusable={false} tooltipStyle>
      <SparkleIcon size={13} label="AI agent working" className="text-accent" />
    </HoverCardTrigger>
  );
}
