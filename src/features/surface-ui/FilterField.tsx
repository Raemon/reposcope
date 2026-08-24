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
    <span className={`relative inline-flex items-center ${className}`}>
      <SearchIcon />
      <input
        type="search"
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded bg-field py-1 pl-6 pr-2 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent"
        {...rest}
      />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="pointer-events-none absolute left-2 h-3 w-3 text-ink-dim"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="6.75" cy="6.75" r="4.25" />
      <path d="M10 10l3.5 3.5" />
    </svg>
  );
}

export function matchesFilter(filter: string, ...haystacks: (string | undefined)[]): boolean {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return true;
  return haystacks.some((held) => held !== undefined && held.toLowerCase().includes(needle));
}
