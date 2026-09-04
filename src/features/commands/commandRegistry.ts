'use client';

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { stepSequence } from './keyChords';

export interface Command {
  id: string;
  title: string;
  group: string;
  keys?: string[];
  detail?: string;
  run: () => void;
}

export interface CommandBinding {
  keys: string;
  command: Command;
}

const NONE: Command[] = [];
const providers = new Set<{ current: Command[] }>();
const listeners = new Set<() => void>();
let snapshot: Command[] = NONE;

export function readCommands(): Command[] {
  return snapshot;
}

export function useRegisteredCommands(): Command[] {
  return useSyncExternalStore(subscribe, readCommands, () => NONE);
}

export function useCommands(commands: Command[]): void {
  const provider = useRef<Command[]>(NONE);
  provider.current = commands;
  useLayoutEffect(() => {
    providers.add(provider);
    publish();
    return () => {
      providers.delete(provider);
      publish();
    };
  }, []);
  // Callers pass a new array each render, so run() closures never go stale.
  useLayoutEffect(publish, [commands]);
}

function publish(): void {
  snapshot = dedupeCommands([...providers].flatMap((provider) => provider.current));
  listeners.forEach((notify) => notify());
}

// Later (inner) registrations override earlier ones with the same id.
export function dedupeCommands(commands: Command[]): Command[] {
  const byId = new Map<string, Command>();
  for (const command of commands) byId.set(command.id, command);
  return [...byId.values()];
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function commandBindings(commands: Command[]): CommandBinding[] {
  return commands.flatMap((command) => (command.keys ?? []).map((keys) => ({ keys, command })));
}

export interface PressResolution {
  pressed: string[];
  command: Command | null;
}

export function commandForPress(pressed: string[], chord: string, commands: Command[]): PressResolution {
  const bindings = commandBindings(commands);
  const step = stepSequence(pressed, chord, bindings.map((binding) => binding.keys));
  return { pressed: step.pressed, command: step.hit === null ? null : bindings[step.hit]?.command ?? null };
}
