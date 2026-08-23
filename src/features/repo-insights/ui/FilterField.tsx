'use client';

import type { KeyboardEvent, RefObject } from 'react';

export function FilterField({
  value,
  onChange,
  placeholder,
  ref,
  onFocus,
  onKeyDown,
  className = 'mb-2 w-64',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ref?: RefObject<HTMLInputElement | null>;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <input
      ref={ref}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`rounded border border-btn-edge bg-field px-2 py-1 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
    />
  );
}

export function matchesFilter(filter: string, ...haystacks: (string | undefined)[]): boolean {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return true;
  return haystacks.some((held) => held !== undefined && held.toLowerCase().includes(needle));
}
