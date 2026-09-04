import { commandForKey, type Command } from './commandStore';
import { isTyping } from './isTyping';

export function togglesPalette(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k';
}

export function hotkeyCommand(event: KeyboardEvent): Command | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return null;
  if (isTyping(event.target) || document.querySelector('dialog[open]') !== null) return null;
  return commandForKey(event.key.toLowerCase());
}
