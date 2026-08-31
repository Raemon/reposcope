'use client';

import type { ReactNode } from 'react';
import { applyFoldMode, useFoldCommand, type FoldMode } from './foldModeStore';
import { ChoiceButton } from '@/features/surface-ui/ChoiceButton';
import { CollapseAllIcon, ExpandAllIcon, GitHunksIcon, SmartFoldIcon } from './diffToolbarIcons';

const CHOICES: { mode: FoldMode; icon: ReactNode; label: string }[] = [
  { mode: 'default', icon: <SmartFoldIcon />, label: 'Default folding — whole file, with unchanged blocks and fully deleted files collapsed' },
  { mode: 'expandAll', icon: <ExpandAllIcon />, label: 'Expand all code sections' },
  { mode: 'collapseAll', icon: <CollapseAllIcon />, label: 'Collapse all code sections' },
  { mode: 'gitDefault', icon: <GitHunksIcon />, label: 'Git default — the diff hunks exactly as GitHub shows them, with nothing folded' },
];

export function FoldModeButtons() {
  const command = useFoldCommand();
  return (
    <span className="flex items-center gap-2">
      {CHOICES.map(({ mode, icon, label }) => (
        <ChoiceButton key={mode} label={label} active={command.mode === mode} onSelect={() => applyFoldMode(mode)}>
          {icon}
        </ChoiceButton>
      ))}
    </span>
  );
}
