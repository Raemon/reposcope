'use client';

import type { ReactNode } from 'react';
import { useSheetRows } from './centralLayout';
import { useColumnNav } from './columnNav';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

const ROW = 'flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4';
const SERIF_ROW = 'flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 font-serif text-[12px] leading-[1.15]';
const SHEET_ROW = 'flex min-w-0 flex-1 items-baseline gap-2.5 px-5 py-2 text-row';
const SHEET_SERIF_ROW = 'flex min-w-0 flex-1 items-center gap-2.5 px-5 py-2.5 font-serif text-row';

function rowClass(wide: boolean, serif: boolean): string {
  if (!wide) return serif ? SERIF_ROW : ROW;
  return serif ? SHEET_SERIF_ROW : SHEET_ROW;
}

export function NavListRow({
  route,
  href,
  current,
  dimmed = false,
  serif = false,
  onPointerEnter,
  trailing,
  children,
}: {
  route: string;
  href: string;
  current: boolean;
  dimmed?: boolean;
  serif?: boolean;
  onPointerEnter?: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const row = useColumnNav('pulls').row(route, current);
  const wide = useSheetRows();
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`group flex border-b ${wide ? 'border-ink/10' : 'border-ink/15'} ${serif ? 'items-center' : 'items-baseline'} ${rowStateClass(row.state, wide)} ${dimmed ? 'opacity-50' : ''}`}
    >
      <SelectableLink href={href} current={current} onPointerEnter={onPointerEnter} className={rowClass(wide, serif)}>
        {children}
      </SelectableLink>
      {trailing}
    </div>
  );
}
