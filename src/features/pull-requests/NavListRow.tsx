'use client';

import type { ReactNode } from 'react';
import { useColumnNav } from './columnNav';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

const ROW = 'flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4';
const SERIF_ROW = 'flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 font-serif text-[14px] leading-[1.2]';

export function NavListRow({
  route,
  href,
  current,
  dimmed = false,
  serif = false,
  onPointerEnter,
  onSelect,
  trailing,
  children,
}: {
  route: string;
  href: string;
  current: boolean;
  dimmed?: boolean;
  serif?: boolean;
  onPointerEnter?: () => void;
  onSelect?: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const row = useColumnNav('pulls').row(route, current);
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`group flex border-b border-ink/15 ${serif ? 'items-center' : 'items-baseline'} ${rowStateClass(row.state)} ${dimmed ? 'opacity-50' : ''}`}
    >
      <SelectableLink href={href} current={current} onPointerEnter={onPointerEnter} onSelect={onSelect} className={serif ? SERIF_ROW : ROW}>
        {children}
      </SelectableLink>
      {trailing}
    </div>
  );
}
