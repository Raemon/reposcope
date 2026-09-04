'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { smallChoiceClass } from './buttonStyles';

export function SmallChoiceButton({
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} {...props} className={smallChoiceClass(className)} />;
}

export function SmallChoiceLink({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={smallChoiceClass(className)} />;
}
