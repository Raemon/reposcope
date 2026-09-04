'use client';

import { CommandPalette } from './CommandPalette';
import { useAppCommands } from './appCommands';
import { useKeyBindings } from './useKeyBindings';

export function CommandCenter() {
  useKeyBindings();
  useAppCommands();
  return <CommandPalette />;
}
