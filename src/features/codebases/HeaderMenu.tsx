'use client';

import type { ReactNode } from 'react';
import { useCommand, type CommandSpec } from '@/features/hotkeys/commandStore';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';
import { SELECTABLE_TEXT, useSelectableClick } from '@/features/surface-ui/selectableClick';

export function HeaderMenu({
  label,
  width,
  command = null,
  children,
}: {
  label: ReactNode;
  width: string;
  command?: CommandSpec | null;
  children: (close: () => void) => ReactNode;
}) {
  return (
    <PopoverMenu
      align="left-0"
      panelClass={`flex max-h-[70vh] flex-col overflow-hidden ${width}`}
      trigger={(state) => <LabelButton label={label} command={command} {...state} />}
    >
      {children}
    </PopoverMenu>
  );
}

function LabelButton({ label, command, open, toggle }: PopoverTrigger & { label: ReactNode; command: CommandSpec | null }) {
  useCommand(command, toggle);
  const labelClick = useSelectableClick<HTMLButtonElement>(toggle);
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      {...labelClick}
      className={`flex max-w-[22rem] items-baseline gap-1 rounded px-1.5 py-0.5 text-[13px] ${SELECTABLE_TEXT} ${
        open ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'
      }`}
    >
      <span className="truncate">{label}</span>
      <span aria-hidden className="shrink-0 text-[11px] text-ink-dim/60">
        ▾
      </span>
    </button>
  );
}
