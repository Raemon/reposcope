'use client';

import { setOnlyMine, setPullState, usePullFilters } from './pullFilterStore';
import { iconButtonClass } from '@/features/surface-ui/buttonStyles';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';

const FILTER_LABEL = 'Filter pull requests';

export function PullFilterMenu() {
  const filters = usePullFilters();
  return (
    <PopoverMenu align="right-0" panelClass="w-44 py-1" trigger={FilterButton}>
      {() => (
        <>
          <FilterCheckbox label="only open PRs" on={filters.state === 'open'} onChange={(on) => setPullState('open', on)} />
          <FilterCheckbox label="only closed PRs" on={filters.state === 'closed'} onChange={(on) => setPullState('closed', on)} />
          <FilterCheckbox label="only my PRs" on={filters.onlyMine} onChange={setOnlyMine} />
        </>
      )}
    </PopoverMenu>
  );
}

function FilterButton({ open, toggle }: PopoverTrigger) {
  return (
    <HoverCardTrigger label={FILTER_LABEL} focusable={false} tooltipStyle>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={FILTER_LABEL}
        onClick={toggle}
        className={`${iconButtonClass(open)} px-1`}
      >
        <FilterIcon />
      </button>
    </HoverCardTrigger>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 5h17l-6.5 7.6V20l-4-2.6v-4.8Z" />
    </svg>
  );
}

function FilterCheckbox({ label, on, onChange }: { label: string; on: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-[11px] leading-4 text-ink hover:bg-btn-hover">
      <input
        type="checkbox"
        checked={on}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3 accent-accent"
      />
      {label}
    </label>
  );
}
