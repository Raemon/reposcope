'use client';

import { useContext, type ReactNode } from 'react';
import { DIFF_LAYOUT_LABEL, setDiffLayout, useDiffLayout, type DiffLayout } from './diffLayoutStore';
import { EditTarget } from './editTarget';
import { setDiffEditMode, useDiffEditMode } from './editModeStore';
import { DiffSortMenu } from './DiffSortMenu';
import { FoldModeButtons } from './FoldModeButtons';
import { ChoiceButton } from '@/features/surface-ui/ChoiceButton';
import type { IconButtonTone } from '@/features/surface-ui/buttonStyles';
import { EditIcon, ResultViewIcon, SplitViewIcon, UnifiedViewIcon, WrapLinesIcon } from './diffToolbarIcons';
import { setDiffWrap, useDiffWrap } from './diffWrapStore';

const CHOICES: { layout: DiffLayout; icon: ReactNode; tone?: IconButtonTone }[] = [
  { layout: 'split', icon: <SplitViewIcon /> },
  { layout: 'unified', icon: <UnifiedViewIcon /> },
  { layout: 'result', icon: <ResultViewIcon />, tone: 'add' },
];

export function DiffLayoutToggle({ sortable }: { sortable: boolean }) {
  const current = useDiffLayout();
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-2 border-b border-panel-edge bg-panel px-2 py-[2px]">
      <FoldModeButtons />
      <span className="ml-auto flex items-center gap-2">
        {CHOICES.map(({ layout, icon, tone }) => (
          <ChoiceButton
            key={layout}
            label={DIFF_LAYOUT_LABEL[layout]}
            active={current === layout}
            tone={tone}
            placement="top-end"
            onSelect={() => setDiffLayout(layout)}
          >
            {icon}
          </ChoiceButton>
        ))}
        <WrapToggle />
        <EditModeToggle />
        {sortable && <DiffSortMenu />}
      </span>
    </div>
  );
}

function WrapToggle() {
  const wrap = useDiffWrap();
  return (
    <ChoiceButton
      label="Wrap long lines instead of scrolling them sideways"
      active={wrap}
      placement="top-end"
      onSelect={() => setDiffWrap(!wrap)}
    >
      <WrapLinesIcon />
    </ChoiceButton>
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
      placement="top-end"
      onSelect={() => setDiffEditMode(!editMode)}
    >
      <EditIcon />
    </ChoiceButton>
  );
}
