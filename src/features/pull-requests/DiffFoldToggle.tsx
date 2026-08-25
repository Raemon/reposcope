'use client';

import type { FileFolds } from './fileFolds';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

const CHOICES: { expanded: boolean; icon: string; label: string; title: string }[] = [
  { expanded: false, icon: '▸', label: 'collapse all', title: 'Show only the declaration lines of every file' },
  { expanded: true, icon: '▾', label: 'expand all', title: 'Show the full diff of every file' },
];

export function DiffFoldToggle({ folds }: { folds: FileFolds }) {
  return (
    <div className="flex items-center gap-1">
      {CHOICES.map(({ expanded, icon, label, title }) => (
        <button
          key={label}
          type="button"
          onClick={() => folds.setAll(expanded)}
          title={title}
          className={`${BUTTON} px-1.5 text-[9px] leading-4`}
        >
          <span aria-hidden className="pr-1">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
