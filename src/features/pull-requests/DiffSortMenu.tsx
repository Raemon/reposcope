'use client';

import { setDiffSort, useDiffSort, type DiffSort } from './diffSortStore';
import { MenuIconButton, PopoverMenu } from '@/features/surface-ui/PopoverMenu';
import { SortIcon } from './diffToolbarIcons';

const CHOICES: { sort: DiffSort; label: string }[] = [
  { sort: 'comments', label: 'inline comments' },
  { sort: 'diff', label: 'line-diff, excluding imports' },
  { sort: 'diffAll', label: 'line-diff, all lines' },
  { sort: 'folder', label: 'alphabetical folder' },
];

export function DiffSortMenu() {
  const current = useDiffSort();
  return (
    <PopoverMenu
      align="right-0"
      panelClass="w-52 py-1"
      trigger={(state) => (
        <MenuIconButton label={sortLabel(current)} {...state}>
          <SortIcon />
        </MenuIconButton>
      )}
    >
      {(close) => CHOICES.map((choice) => <SortChoice key={choice.sort} {...choice} current={current} close={close} />)}
    </PopoverMenu>
  );
}

function sortLabel(current: DiffSort): string {
  return `Sort files by ${(CHOICES.find((choice) => choice.sort === current) ?? CHOICES[0]!).label}`;
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
