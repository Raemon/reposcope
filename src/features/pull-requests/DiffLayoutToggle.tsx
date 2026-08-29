'use client';

import { setDiffLayout, useDiffLayout, type DiffLayout } from './diffLayoutStore';
import { DiffSortMenu } from './DiffSortMenu';
import { BUTTON } from '@/features/surface-ui/buttonStyles';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

const CHOICES: { layout: DiffLayout; icon: string; label: string }[] = [
  { layout: 'split', icon: '▥', label: 'two-column' },
  { layout: 'unified', icon: '▤', label: 'one-column' },
];

export function DiffLayoutToggle() {
  const current = useDiffLayout();
  return (
    <div className="relative z-30 flex shrink-0 items-center justify-end gap-1 border-b border-panel-edge bg-panel px-1.5 py-[1px]">
      <span className="hidden items-center gap-1 md:flex">
        {CHOICES.map(({ layout, icon, label }) => (
          <HoverCardTrigger key={layout} label={`Show diffs in a ${label} view`} focusable={false} tooltipStyle>
            <button
              type="button"
              onClick={() => setDiffLayout(layout)}
              aria-pressed={current === layout}
              className={`${BUTTON} px-1.5 text-[9px] leading-4 ${current === layout ? 'bg-btn-active text-ink' : ''}`}
            >
              <span aria-hidden className="pr-1">{icon}</span>
              {label}
            </button>
          </HoverCardTrigger>
        ))}
      </span>
      <DiffSortMenu />
    </div>
  );
}
