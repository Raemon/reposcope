'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

export interface CommandSpec {
  id: string;
  label: string;
  keys: string[];
}

export interface Command extends CommandSpec {
  run: () => void;
}

const commands = new Map<string, Command>();
const listeners = new Set<() => void>();
let listed: Command[] = [];
const NONE: Command[] = [];

function publish(): void {
  listed = [...commands.values()].sort((a, b) => (a.keys[0] ?? '').localeCompare(b.keys[0] ?? ''));
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function registerCommand(command: Command): () => void {
  commands.set(command.id, command);
  publish();
  return () => {
    if (commands.get(command.id) === command) commands.delete(command.id);
    publish();
  };
}

export function commandForKey(key: string): Command | null {
  return listed.find((command) => command.keys.includes(key)) ?? null;
}

export function useCommands(): Command[] {
  return useSyncExternalStore(subscribe, () => listed, () => NONE);
}

export function useCommand(spec: CommandSpec | null, run: () => void): void {
  const latest = useRef(run);
  latest.current = run;
  const id = spec?.id ?? null;
  const label = spec?.label ?? '';
  const keys = spec?.keys.join(' ') ?? '';
  useEffect(() => {
    if (id === null) return;
    return registerCommand({ id, label, keys: keys.split(' '), run: () => latest.current() });
  }, [id, label, keys]);
}
