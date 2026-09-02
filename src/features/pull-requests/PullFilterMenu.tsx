'use client';

import { FilterIcon } from './diffToolbarIcons';
import { setOnlyMine, setPullState, usePullFilters } from './pullFilterStore';
import { MenuIconButton, PopoverMenu } from '@/features/surface-ui/PopoverMenu';

const FILTER_LABEL = 'Filter pull requests';

export function PullFilterMenu() {
  const filters = usePullFilters();
  return (
    <PopoverMenu
      align="right-0"
      panelClass="w-44 py-1"
      trigger={(state) => (
        <MenuIconButton label={FILTER_LABEL} {...state}>
          <FilterIcon />
        </MenuIconButton>
      )}
    >
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
