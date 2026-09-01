'use client';

import { setOnlyMine, setPullState, usePullFilters } from './pullFilterStore';
import { setPullSort, usePullSort } from './pullSortStore';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';

export function PullFilterMenu() {
  const filters = usePullFilters();
  const sort = usePullSort();
  return (
    <PopoverMenu align="right-0" panelClass="w-44 py-1" trigger={GearButton}>
      {() => (
        <>
          <FilterCheckbox label="only open PRs" on={filters.state === 'open'} onChange={(on) => setPullState('open', on)} />
          <FilterCheckbox label="only closed PRs" on={filters.state === 'closed'} onChange={(on) => setPullState('closed', on)} />
          <FilterCheckbox label="only my PRs" on={filters.onlyMine} onChange={setOnlyMine} />
          <FilterCheckbox
            label="sort by attention"
            on={sort === 'attention'}
            onChange={(on) => setPullSort(on ? 'attention' : 'updated')}
          />
        </>
      )}
    </PopoverMenu>
  );
}

function GearButton({ open, toggle }: PopoverTrigger) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Pull request filters"
      onClick={toggle}
      className={`px-1 text-[11px] leading-4 ${open ? 'text-accent' : 'text-ink-dim hover:text-ink'}`}
    >
      ⚙
    </button>
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
