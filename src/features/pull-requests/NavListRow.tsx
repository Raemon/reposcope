'use client';

import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useColumnNav } from './columnNav';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

const ROW = 'flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4';
const STACKED_ROW = 'flex min-w-0 flex-1 flex-col text-left';

export function NavListRow({
  route,
  href,
  current,
  dimmed = false,
  stacked = false,
  onPointerEnter,
  onSelect,
  trailing,
  children,
}: {
  route: string;
  href: string;
  current: boolean;
  dimmed?: boolean;
  stacked?: boolean;
  onPointerEnter?: () => void;
  onSelect?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const row = useColumnNav('pulls').row(route, current);
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`group flex border-b ${stacked ? 'items-stretch border-ink/30' : 'items-baseline border-ink/15'} ${rowStateClass(row.state)} ${dimmed ? 'opacity-50' : ''}`}
    >
      <SelectableLink href={href} current={current} onPointerEnter={onPointerEnter} onSelect={onSelect} className={stacked ? STACKED_ROW : ROW}>
        {children}
      </SelectableLink>
      {trailing}
    </div>
  );
}
