'use client';

import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useCommands, type Command } from './commandStore';
import { FilterField } from '@/features/surface-ui/FilterField';
import { ModalShell } from '@/features/surface-ui/ModalShell';

const ROW = 'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] leading-4';
const KEY = 'rounded bg-btn px-1 py-[1px] font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim';

const CURSOR_STEPS: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const shown = matchingCommands(useCommands(), query);
  const at = Math.min(cursor, Math.max(0, shown.length - 1));
  const run = (command: Command) => {
    onClose();
    command.run();
  };
  const onKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const step = CURSOR_STEPS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      setCursor(wrap(at + step, shown.length));
    } else if (event.key === 'Enter' && shown[at]) run(shown[at]);
  };
  return (
    <ModalShell label="Commands" dismissable onDismiss={onClose}>
      <FilterField
        value={query}
        onChange={(next) => {
          setQuery(next);
          setCursor(0);
        }}
        onKeyDown={onKey}
        placeholder="Type a command…"
        aria-label="Filter commands"
        className="mt-2 w-full"
      />
      <ul className="mt-2 max-h-[50vh] overflow-auto" role="listbox">
        {shown.map((command, index) => (
          <CommandRow key={command.id} command={command} current={index === at} onHover={() => setCursor(index)} onRun={() => run(command)} />
        ))}
        {shown.length === 0 && <li className="px-2 py-1 text-[11px] text-ink-dim">No matching commands.</li>}
      </ul>
      <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-ink-dim">↑↓ move · ⏎ run · esc close</p>
    </ModalShell>
  );
}

function CommandRow({ command, current, onHover, onRun }: { command: Command; current: boolean; onHover: () => void; onRun: () => void }) {
  return (
    <li role="option" aria-selected={current}>
      <button
        type="button"
        onPointerEnter={onHover}
        onClick={onRun}
        className={`${ROW} ${current ? 'bg-btn-active text-accent' : 'text-ink hover:bg-btn-hover'}`}
      >
        <span className="min-w-0 flex-1 truncate">{command.label}</span>
        {command.keys.map((key) => (
          <kbd key={key} className={KEY}>
            {key}
          </kbd>
        ))}
      </button>
    </li>
  );
}

function matchingCommands(commands: Command[], query: string): Command[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return commands;
  return commands.filter((command) => command.label.toLowerCase().includes(needle) || command.keys.includes(needle));
}

function wrap(index: number, count: number): number {
  return count === 0 ? 0 : (index + count) % count;
}
