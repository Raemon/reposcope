import { commandForKey, type Command } from './commandStore';
import { keyboardBusy } from './keyboardBusy';

export function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.repeat && event.key.toLowerCase() === 'k';
}

export function commandForHotkey(event: KeyboardEvent): Command | null {
  if (hasModifier(event) || event.repeat || keyboardBusy(event)) return null;
  return commandForKey(event.key.toLowerCase());
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
}
