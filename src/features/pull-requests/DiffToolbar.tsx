'use client';

import { DiffFoldToggle } from './DiffFoldToggle';
import { DiffLayoutToggle } from './DiffLayoutToggle';
import type { FileFolds } from './fileFolds';

export function DiffToolbar({ folds }: { folds: FileFolds }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-panel-edge bg-panel px-1.5 py-[1px]">
      <DiffFoldToggle folds={folds} />
      <DiffLayoutToggle />
    </div>
  );
}
