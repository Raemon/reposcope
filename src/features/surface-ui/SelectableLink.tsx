'use client';

import Link from 'next/link';
import type { ReactNode, Ref } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from './selectableClick';

export function SelectableLink({
  href,
  className,
  current,
  cursor,
  ref,
  onPointerEnter,
  onSelect,
  children,
}: {
  href: string;
  className: string;
  current?: boolean;
  cursor?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  onPointerEnter?: () => void;
  onSelect?: () => void;
  children: ReactNode;
}) {
  const linkClick = useSelectableClick<HTMLAnchorElement>(onSelect);
  return (
    <Link
      ref={ref}
      href={href}
      {...linkClick}
      onPointerEnter={onPointerEnter}
      data-nav-cursor={cursor || undefined}
      aria-current={current ? 'page' : undefined}
      className={`${className} ${SELECTABLE_TEXT}`}
    >
      {children}
    </Link>
  );
}
