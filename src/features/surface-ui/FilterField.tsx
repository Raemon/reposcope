'use client';

import type { ComponentProps } from 'react';

export function FilterField({
  onChange,
  className = 'mb-2 w-64',
  ...rest
}: Omit<ComponentProps<'input'>, 'onChange' | 'className' | 'type'> & {
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <input
      type="search"
      onChange={(event) => onChange(event.target.value)}
      className={`rounded border border-btn-edge bg-field px-2 py-1 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
      {...rest}
    />
  );
}

export function matchesFilter(filter: string, ...haystacks: (string | undefined)[]): boolean {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return true;
  return haystacks.some((held) => held !== undefined && held.toLowerCase().includes(needle));
}
