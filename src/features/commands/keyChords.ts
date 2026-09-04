export interface KeyPress {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const MODIFIER_KEYS = new Set(['Shift', 'Meta', 'Control', 'Alt', 'CapsLock']);
const CODE_KEYS: Record<string, string> = { BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Slash: '/', Period: '.', Comma: ',' };
const NAMED_GLYPHS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: '↩',
  Escape: 'Esc',
  Backspace: '⌫',
};

export function chordOf(event: KeyPress, mac: boolean): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const modifiers = modifierParts(event, mac);
  if (modifiers.length === 0 || shiftTyped(event, modifiers)) return event.key;
  return [...modifiers, physicalKey(event)].join('+');
}

// Shift alone produced the symbol ('?' from '/'), so the symbol is the whole chord.
function shiftTyped(event: KeyPress, modifiers: string[]): boolean {
  return modifiers.length === 1 && modifiers[0] === 'shift' && event.key.length === 1;
}

function modifierParts(event: KeyPress, mac: boolean): string[] {
  const mod = mac ? event.metaKey : event.ctrlKey;
  const other = mac ? event.ctrlKey : event.metaKey;
  const parts: string[] = [];
  if (mod) parts.push('mod');
  if (other) parts.push(mac ? 'ctrl' : 'meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  return parts;
}

// Alt on a Mac types a symbol ('˚' for k), so modified chords name the physical key.
function physicalKey(event: KeyPress): string {
  const coded = event.code.match(/^(?:Key|Digit)(.)$/)?.[1] ?? CODE_KEYS[event.code];
  const key = coded ?? event.key;
  return key.length === 1 ? key.toLowerCase() : key;
}

export interface BindingMatch {
  exact: number[];
  pending: boolean;
}

export function matchBindings(pressed: string[], bindings: string[]): BindingMatch {
  const exact: number[] = [];
  let pending = false;
  bindings.forEach((binding, index) => {
    const chords = binding.split(' ');
    if (!startsWith(chords, pressed)) return;
    if (chords.length === pressed.length) exact.push(index);
    else pending = true;
  });
  return { exact, pending };
}

function startsWith(chords: string[], pressed: string[]): boolean {
  return pressed.length <= chords.length && pressed.every((chord, at) => chords[at] === chord);
}

export interface SequenceStep {
  pressed: string[];
  hit: number | null;
}

export function stepSequence(pressed: string[], chord: string, bindings: string[]): SequenceStep {
  const attempt = [...pressed, chord];
  const match = matchBindings(attempt, bindings);
  const hit = match.exact[match.exact.length - 1];
  if (hit !== undefined) return { pressed: [], hit };
  if (match.pending) return { pressed: attempt, hit: null };
  const deadPrefix = pressed.length > 0;
  return deadPrefix ? stepSequence([], chord, bindings) : { pressed: [], hit: null };
}

export function formatBinding(binding: string, mac: boolean): string {
  return binding
    .split(' ')
    .map((chord) => formatChord(chord, mac))
    .join(' ');
}

function formatChord(chord: string, mac: boolean): string {
  const parts = chord.split('+');
  if (parts.length === 1) return NAMED_GLYPHS[chord] ?? chord;
  const glyphs = parts.map((part) => modifierGlyph(part, mac));
  return mac ? glyphs.join('') : glyphs.join('+');
}

function modifierGlyph(part: string, mac: boolean): string {
  if (part === 'mod') return mac ? '⌘' : 'Ctrl';
  if (part === 'shift') return mac ? '⇧' : 'Shift';
  if (part === 'alt') return mac ? '⌥' : 'Alt';
  if (part === 'ctrl') return mac ? '⌃' : 'Ctrl';
  if (part === 'meta') return mac ? '⌘' : 'Win';
  return NAMED_GLYPHS[part] ?? part.toUpperCase();
}
