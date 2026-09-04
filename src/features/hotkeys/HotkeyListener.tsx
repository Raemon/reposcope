'use client';

import { useEffect, useState } from 'react';
import { CommandPalette } from './CommandPalette';
import { commandForHotkey, isPaletteShortcut } from './hotkeyEvents';

export function HotkeyListener() {
  const [open, setOpen] = useState(false);
  useEffect(() => listenForHotkeys(() => setOpen((held) => !held)), []);
  return open ? <CommandPalette onClose={() => setOpen(false)} /> : null;
}

function listenForHotkeys(togglePalette: () => void): () => void {
  const onKey = (event: KeyboardEvent) => dispatchHotkey(event, togglePalette);
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

function dispatchHotkey(event: KeyboardEvent, togglePalette: () => void): void {
  const run = isPaletteShortcut(event) ? togglePalette : commandForHotkey(event)?.run;
  if (!run) return;
  event.preventDefault();
  run();
}
