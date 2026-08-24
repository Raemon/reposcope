'use client';

import Link from 'next/link';
import type { ReactNode, Ref } from 'react';
import { SELECTABLE_TEXT, useSelectableClick } from './selectableClick';

export function SelectableLink({
  href,
  className,
  title,
  current,
  ref,
  children,
}: {
  href: string;
  className: string;
  title?: string;
  current?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  children: ReactNode;
}) {
  const linkClick = useSelectableClick<HTMLAnchorElement>();
  return (
    <Link
      ref={ref}
      href={href}
      {...linkClick}
      title={title}
      aria-current={current ? 'page' : undefined}
      className={`${className} ${SELECTABLE_TEXT}`}
    >
      {children}
    </Link>
  );
}
