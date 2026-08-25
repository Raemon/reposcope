'use client';

import { setDiffLayout, useDiffLayout, type DiffLayout } from './diffLayoutStore';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

const CHOICES: { layout: DiffLayout; icon: string; label: string }[] = [
  { layout: 'split', icon: '▥', label: 'two-column' },
  { layout: 'unified', icon: '▤', label: 'one-column' },
];

export function DiffLayoutToggle() {
  const current = useDiffLayout();
  return (
    <div className="flex items-center gap-1">
      {CHOICES.map(({ layout, icon, label }) => (
        <button
          key={layout}
          type="button"
          onClick={() => setDiffLayout(layout)}
          aria-pressed={current === layout}
          title={`Show diffs in a ${label} view`}
          className={`${BUTTON} px-1.5 text-[9px] leading-4 ${current === layout ? 'bg-btn-active text-ink' : ''}`}
        >
          <span aria-hidden className="pr-1">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
