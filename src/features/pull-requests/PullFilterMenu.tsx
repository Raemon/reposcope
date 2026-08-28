'use client';

import { useRef, useState } from 'react';
import { PULL_FILTERS, setPullFilter, usePullFilters } from './pullFilterStore';
import { useMenuDismiss } from '@/features/surface-ui/useMenuDismiss';

export function PullFilterMenu() {
  const filters = usePullFilters();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useMenuDismiss(menu, open, () => setOpen(false));
  return (
    <div ref={menu} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Pull request filters"
        onClick={() => setOpen((held) => !held)}
        className={`px-1 text-[11px] leading-4 ${open ? 'text-accent' : 'text-ink-dim hover:text-ink'}`}
      >
        ⚙
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded bg-panel py-1 shadow-card">
          {PULL_FILTERS.map(({ key, label }) => (
            <FilterCheckbox key={key} label={label} on={filters[key]} onChange={(next) => setPullFilter(key, next)} />
          ))}
        </div>
      )}
    </div>
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
