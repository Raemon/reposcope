'use client';

import { PULL_FILTERS, setPullFilter, usePullFilters } from './pullFilterStore';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';

export function PullFilterMenu() {
  const filters = usePullFilters();
  return (
    <PopoverMenu align="right-0" panelClass="w-44 py-1" trigger={(state) => <GearButton {...state} />}>
      {() =>
        PULL_FILTERS.map(({ key, label }) => (
          <FilterCheckbox key={key} label={label} on={filters[key]} onChange={(next) => setPullFilter(key, next)} />
        ))
      }
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
