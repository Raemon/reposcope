'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { BUTTON } from './buttonStyles';

const CLASS = `${BUTTON} px-1.5 py-[2px] text-[9px]`;

const joinClass = (className?: string) => (className ? `${CLASS} ${className}` : CLASS);

export function SmallChoiceButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button {...props} className={joinClass(className)}>
      {children}
    </button>
  );
}

export function SmallChoiceLink({
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a {...props} className={joinClass(className)}>
      {children}
    </a>
  );
}
