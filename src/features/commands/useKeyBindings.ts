'use client';

import { useEffect } from 'react';
import { commandForPress, readCommands } from './commandRegistry';
import { chordOf } from './keyChords';
import { useIsMac } from './platform';

const SEQUENCE_MS = 1500;

export function useKeyBindings(): void {
  const mac = useIsMac();
  useEffect(() => listenForCommands(mac), [mac]);
}

function listenForCommands(mac: boolean): () => void {
  let pressed: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onKey = (event: KeyboardEvent) => {
    const chord = chordToHandle(event, mac);
    if (chord === null) return;
    const step = commandForPress(pressed, chord, readCommands());
    pressed = step.pressed;
    timer = armReset(timer, () => (pressed = []));
    if (step.command === null && pressed.length === 0) return;
    event.preventDefault();
    step.command?.run();
  };
  window.addEventListener('keydown', onKey);
  return () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
  };
}

function chordToHandle(event: KeyboardEvent, mac: boolean): string | null {
  // Handlers that preventDefault (palette input, modals, menus) take precedence.
  if (event.defaultPrevented) return null;
  const chord = chordOf(event, mac);
  if (chord === null || (isTyping(event.target) && !hasModifier(chord))) return null;
  return chord;
}

function armReset(timer: ReturnType<typeof setTimeout> | undefined, reset: () => void): ReturnType<typeof setTimeout> {
  clearTimeout(timer);
  return setTimeout(reset, SEQUENCE_MS);
}

// A bare '+' is the plus key, not a modifier chord.
function hasModifier(chord: string): boolean {
  return chord.includes('+') && chord.length > 1;
}

export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}
