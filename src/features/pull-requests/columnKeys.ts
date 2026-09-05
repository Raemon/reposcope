import { keyboardBusy } from '@/features/hotkeys/keyboardBusy';

export type NavAction =
  | { kind: 'column'; delta: number }
  | { kind: 'cursor'; delta: number }
  | { kind: 'activate' }
  | { kind: 'escape' };

const KEY_ACTIONS: Record<string, NavAction> = {
  ArrowLeft: { kind: 'column', delta: -1 },
  ArrowRight: { kind: 'column', delta: 1 },
  ArrowUp: { kind: 'cursor', delta: -1 },
  ArrowDown: { kind: 'cursor', delta: 1 },
  Enter: { kind: 'activate' },
  Escape: { kind: 'escape' },
};

export function navActionFor(event: KeyboardEvent): NavAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (keyboardBusy(event)) return null;
  return KEY_ACTIONS[event.key] ?? null;
}
