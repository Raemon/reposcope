'use client';

import type { ComponentProps } from 'react';

const VARIANTS = {
  field: 'bg-field py-1 pl-6 text-[11px] focus:ring-1 focus:ring-accent',
  plain: 'bg-transparent py-1.5 pl-7 text-[14px]',
};

export function FilterField({
  onChange,
  className = 'mb-2 w-64',
  variant = 'field',
  ...rest
}: Omit<ComponentProps<'input'>, 'onChange' | 'className' | 'type'> & {
  onChange: (next: string) => void;
  className?: string;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <SearchIcon large={variant === 'plain'} />
      <input
        type="search"
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded pr-2 font-mono text-ink placeholder:text-ink-dim focus:outline-none ${VARIANTS[variant]}`}
        {...rest}
      />
    </span>
  );
}

function SearchIcon({ large }: { large: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`pointer-events-none absolute left-2 text-ink-dim ${large ? 'h-3.5 w-3.5' : 'h-3 w-3'}`}
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
