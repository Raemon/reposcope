'use client';

import { applyFoldMode, useFoldCommand, type FoldMode } from './foldModeStore';
import { BUTTON } from '@/features/surface-ui/buttonStyles';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

const CHOICES: { mode: FoldMode; icon: string; label: string }[] = [
  { mode: 'expandAll', icon: '⊞', label: 'Expand all code sections' },
  { mode: 'collapseAll', icon: '⊟', label: 'Collapse all code sections' },
  { mode: 'collapseUnchanged', icon: '±', label: 'Collapse unchanged code sections and expand every hunk to its whole file' },
  { mode: 'default', icon: '⟲', label: 'Default folding — collapse import blocks, expand the rest' },
];

export function FoldModeRail() {
  const command = useFoldCommand();
  return (
    <div className="flex w-6 shrink-0 flex-col items-center gap-1 border-r border-panel-edge bg-panel py-1.5">
      {CHOICES.map(({ mode, icon, label }) => (
        <HoverCardTrigger key={mode} label={label} focusable={false} tooltipStyle>
          <button
            type="button"
            onClick={() => applyFoldMode(mode)}
            aria-pressed={command.mode === mode}
            aria-label={label}
            className={`${BUTTON} h-5 w-5 text-[13px] leading-5 ${command.mode === mode ? 'bg-btn-active text-ink' : ''}`}
          >
            {icon}
          </button>
        </HoverCardTrigger>
      ))}
    </div>
  );
}
