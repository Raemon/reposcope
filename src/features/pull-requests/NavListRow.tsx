'use client';

import type { ReactNode } from 'react';
import { useColumnNav } from './columnNav';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

const ROW = 'flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4';

export function NavListRow({
  route,
  href,
  current,
  dimmed = false,
  onPointerEnter,
  trailing,
  children,
}: {
  route: string;
  href: string;
  current: boolean;
  dimmed?: boolean;
  onPointerEnter?: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const row = useColumnNav('pulls').row(route, current);
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`group flex items-baseline ${rowStateClass(row.state)} ${dimmed ? 'opacity-50' : ''}`}
    >
      <SelectableLink href={href} current={current} onPointerEnter={onPointerEnter} className={ROW}>
        {children}
      </SelectableLink>
      {trailing}
    </div>
  );
}
