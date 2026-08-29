'use client';

import { useContext } from 'react';
import { setDiffLayout, useDiffLayout, type DiffLayout } from './diffLayoutStore';
import { EditTarget } from './editTarget';
import { toggleDiffEditMode, useDiffEditMode } from './editModeStore';
import { DiffSortMenu } from './DiffSortMenu';
import { FoldModeButtons } from './FoldModeButtons';
import { ChoiceButton } from '@/features/surface-ui/ChoiceButton';

const CHOICES: { layout: DiffLayout; icon: string; label: string }[] = [
  { layout: 'split', icon: '▥', label: 'two-column' },
  { layout: 'unified', icon: '▤', label: 'one-column' },
];

export function DiffLayoutToggle() {
  const current = useDiffLayout();
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-1 border-b border-panel-edge bg-panel px-1.5 py-[1px]">
      <FoldModeButtons />
      <span className="ml-auto flex items-center gap-1">
        <span className="hidden items-center gap-1 md:flex">
          {CHOICES.map(({ layout, icon, label }) => (
            <ChoiceButton
              key={layout}
              label={`Show diffs in a ${label} view`}
              active={current === layout}
              onSelect={() => setDiffLayout(layout)}
              className="px-1.5 text-[9px] leading-4"
            >
              <span aria-hidden className="pr-1">{icon}</span>
              {label}
            </ChoiceButton>
          ))}
        </span>
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
      labelled
      active={editMode}
      onSelect={toggleDiffEditMode}
      className="h-4 w-5 text-[11px] leading-4"
    >
      ✎
    </ChoiceButton>
  );
}
