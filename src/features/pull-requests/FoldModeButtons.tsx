'use client';

import type { ReactNode } from 'react';
import { FOLD_MODE_LABEL, applyFoldMode, useFoldCommand, type FoldMode } from './foldModeStore';
import { ChoiceButton } from '@/features/surface-ui/ChoiceButton';
import {
  CollapseExceptCommentsIcon,
  CollapseExceptTypesIcon,
  CollapseHidingCommentsIcon,
  ExpandAllIcon,
  GitHubIcon,
  SmartFoldIcon,
} from './diffToolbarIcons';

const CHOICES: { mode: FoldMode; icon: ReactNode }[] = [
  { mode: 'default', icon: <SmartFoldIcon /> },
  { mode: 'expandAll', icon: <ExpandAllIcon /> },
  { mode: 'collapseExceptTypes', icon: <CollapseExceptTypesIcon /> },
  { mode: 'collapseHidingComments', icon: <CollapseHidingCommentsIcon /> },
  { mode: 'collapseExceptComments', icon: <CollapseExceptCommentsIcon /> },
  { mode: 'gitDefault', icon: <GitHubIcon /> },
];

export function FoldModeButtons() {
  const command = useFoldCommand();
  return (
    <span className="flex items-center gap-2">
      {CHOICES.map(({ mode, icon }) => (
        <ChoiceButton key={mode} label={FOLD_MODE_LABEL[mode]} active={command.mode === mode} placement="top-start" onSelect={() => applyFoldMode(mode)}>
          {icon}
        </ChoiceButton>
      ))}
    </span>
  );
}
