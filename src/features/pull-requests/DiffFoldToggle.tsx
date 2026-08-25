'use client';

import type { FileFolds } from './fileFolds';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

const CHOICES: { expanded: boolean; icon: string; label: string }[] = [
  { expanded: false, icon: '▸', label: 'collapse all' },
  { expanded: true, icon: '▾', label: 'expand all' },
];

export function DiffFoldToggle({ folds }: { folds: FileFolds }) {
  return (
    <div className="flex items-center gap-1">
      {CHOICES.map(({ expanded, icon, label }) => (
        <button
          key={label}
          type="button"
          onClick={() => folds.setAll(expanded)}
          aria-pressed={folds.allExpanded === expanded}
          title={expanded ? 'Show the full diff of every file' : 'Show only declaration lines of every file'}
          className={`${BUTTON} px-1.5 text-[9px] leading-4 ${folds.allExpanded === expanded ? 'bg-btn-active text-ink' : ''}`}
        >
          <span aria-hidden className="pr-1">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
