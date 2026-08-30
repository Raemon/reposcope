'use client';

import { applyFoldMode, useFoldCommand, type FoldMode } from './foldModeStore';
import { ChoiceButton } from '@/features/surface-ui/ChoiceButton';

const CHOICES: { mode: FoldMode; icon: string; label: string }[] = [
  { mode: 'default', icon: '⟲', label: 'Default folding — whole file, with unchanged blocks and fully deleted files collapsed' },
  { mode: 'expandAll', icon: '⊞', label: 'Expand all code sections' },
  { mode: 'collapseAll', icon: '⊟', label: 'Collapse all code sections' },
  { mode: 'gitDefault', icon: '±', label: 'Git default — the diff hunks exactly as GitHub shows them, with nothing folded' },
];

export function FoldModeButtons() {
  const command = useFoldCommand();
  return (
    <span className="flex items-center gap-1">
      {CHOICES.map(({ mode, icon, label }) => (
        <ChoiceButton
          key={mode}
          label={label}
          labelled
          active={command.mode === mode}
          onSelect={() => applyFoldMode(mode)}
          className="h-4 w-5 text-[11px] leading-4"
        >
          {icon}
        </ChoiceButton>
      ))}
    </span>
  );
}
