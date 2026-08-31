'use client';

import { useContext, type ReactNode } from 'react';
import { setDiffLayout, useDiffLayout, type DiffLayout } from './diffLayoutStore';
import { EditTarget } from './editTarget';
import { setDiffEditMode, useDiffEditMode } from './editModeStore';
import { DiffSortMenu } from './DiffSortMenu';
import { FoldModeButtons } from './FoldModeButtons';
import { ChoiceButton } from '@/features/surface-ui/ChoiceButton';
import { EditIcon, SplitViewIcon, UnifiedViewIcon } from './diffToolbarIcons';

const CHOICES: { layout: DiffLayout; icon: ReactNode; label: string }[] = [
  { layout: 'split', icon: <SplitViewIcon />, label: 'two-column' },
  { layout: 'unified', icon: <UnifiedViewIcon />, label: 'one-column' },
];

export function DiffLayoutToggle() {
  const current = useDiffLayout();
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-2 border-b border-panel-edge bg-panel px-2 py-[2px]">
      <FoldModeButtons />
      <span className="ml-auto flex items-center gap-2">
        {CHOICES.map(({ layout, icon, label }) => (
          <ChoiceButton
            key={layout}
            label={`Show diffs in a ${label} view`}
            active={current === layout}
            onSelect={() => setDiffLayout(layout)}
          >
            {icon}
          </ChoiceButton>
        ))}
        <EditModeToggle />
        <DiffSortMenu />
      </span>
    </div>
  );
}

function EditModeToggle() {
  const editMode = useDiffEditMode();
  const target = useContext(EditTarget);
  if (!target?.pull) return null;
  return (
    <ChoiceButton
      label="Edit mode — click any line to edit it; triple-click works either way"
      active={editMode}
      onSelect={() => setDiffEditMode(!editMode)}
    >
      <EditIcon />
    </ChoiceButton>
  );
}
