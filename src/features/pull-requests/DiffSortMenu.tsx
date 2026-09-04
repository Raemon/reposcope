'use client';

import { DIFF_SORT_LABEL, diffSortTitle, setDiffSort, useDiffSort, type DiffSort } from './diffSortStore';
import { iconButtonClass } from '@/features/surface-ui/buttonStyles';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';
import { SortIcon } from './diffToolbarIcons';

const SORTS = Object.keys(DIFF_SORT_LABEL) as DiffSort[];

export function DiffSortMenu() {
  const current = useDiffSort();
  return (
    <PopoverMenu align="right-0" panelClass="w-52 py-1" trigger={(state) => <SortButton current={current} {...state} />}>
      {(close) => SORTS.map((sort) => <SortChoice key={sort} sort={sort} current={current} close={close} />)}
    </PopoverMenu>
  );
}

function SortButton({ current, open, toggle }: PopoverTrigger & { current: DiffSort }) {
  const label = diffSortTitle(current);
  return (
    <HoverCardTrigger label={label} focusable={false} tooltipStyle placement="top-end">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        className={iconButtonClass(open)}
      >
        <SortIcon />
      </button>
    </HoverCardTrigger>
  );
}

function SortChoice({ sort, current, close }: { sort: DiffSort; current: DiffSort; close: () => void }) {
  const active = sort === current;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => {
        setDiffSort(sort);
        close();
      }}
      className={`block w-full px-2 py-1 text-left text-[11px] leading-4 hover:bg-btn-hover ${active ? 'text-accent' : 'text-ink'}`}
    >
      {DIFF_SORT_LABEL[sort]}
    </button>
  );
}
