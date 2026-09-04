'use client';

import { useEffect, useState } from 'react';
import { CommandPalette } from './CommandPalette';
import { hotkeyCommand, togglesPalette } from './hotkeyEvents';

export function HotkeyListener() {
  const [open, setOpen] = useState(false);
  useEffect(() => listenForHotkeys(() => setOpen((held) => !held)), []);
  return open ? <CommandPalette onClose={() => setOpen(false)} /> : null;
}

function listenForHotkeys(togglePalette: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (togglesPalette(event)) {
      event.preventDefault();
      return togglePalette();
    }
    const command = hotkeyCommand(event);
    if (!command) return;
    event.preventDefault();
    command.run();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
