'use client';

import { setDiffSort, useDiffSort, type DiffSort } from './diffSortStore';
import { BUTTON } from '@/features/surface-ui/buttonStyles';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';

const CHOICES: { sort: DiffSort; label: string; short: string }[] = [
  { sort: 'comments', label: 'inline comments', short: 'comments' },
  { sort: 'diff', label: 'line-diff, excluding imports', short: 'line-diff' },
  { sort: 'diffAll', label: 'line-diff, all lines', short: 'line-diff (all)' },
  { sort: 'folder', label: 'folder structure', short: 'folders' },
];

export function DiffSortMenu() {
  const current = useDiffSort();
  return (
    <PopoverMenu align="right-0" panelClass="w-52 py-1" trigger={(state) => <SortButton current={current} {...state} />}>
      {(close) => CHOICES.map((choice) => <SortChoice key={choice.sort} {...choice} current={current} close={close} />)}
    </PopoverMenu>
  );
}

function SortButton({ current, open, toggle }: PopoverTrigger & { current: DiffSort }) {
  const held = CHOICES.find((choice) => choice.sort === current) ?? CHOICES[0]!;
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={toggle}
      className={`${BUTTON} px-1.5 text-[9px] leading-4 ${open ? 'bg-btn-active text-ink' : ''}`}
    >
      sort: {held.short}
      <span aria-hidden className="pl-1">▾</span>
    </button>
  );
}

function SortChoice({ sort, label, current, close }: { sort: DiffSort; label: string; current: DiffSort; close: () => void }) {
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
      {label}
    </button>
  );
}
