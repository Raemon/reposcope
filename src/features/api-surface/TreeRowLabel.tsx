'use client';

import type { MouseEvent, ReactNode } from 'react';

const INDENT_PX = 12;

export function TreeBranchLabel({
  open,
  onToggle,
  depth,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  depth: number;
  label: string;
  children: ReactNode;
}) {
  const toggleFromOwnCell = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.target as Node)) onToggle();
  };
  return (
    <div
      className="flex cursor-pointer select-none items-center gap-2"
      style={{ paddingLeft: `${depth * INDENT_PX}px` }}
      onClick={toggleFromOwnCell}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
        className="flex h-5 w-3 shrink-0 items-center justify-center text-[10px] text-ink-dim outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
      >
        {open ? '▾' : '▸'}
      </button>
      {children}
    </div>
  );
}

export function TreeLeafLabel({
  depth,
  glyph,
  children,
}: {
  depth: number;
  glyph: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * INDENT_PX}px` }}>
      <span className="w-3 shrink-0 text-center text-[10px] text-ink-dim" aria-hidden="true">{glyph}</span>
      {children}
    </div>
  );
}

export function startsOpen(depth: number): boolean {
  return depth === 0;
}
