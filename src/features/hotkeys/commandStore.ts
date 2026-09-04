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
let sorted: Command[] = [];
const EMPTY: Command[] = [];

const byFirstKey = (a: Command, b: Command) => (a.keys[0] ?? '').localeCompare(b.keys[0] ?? '');

function publish(): void {
  sorted = [...commands.values()].sort(byFirstKey);
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
    if (commands.get(command.id) !== command) return;
    commands.delete(command.id);
    publish();
  };
}

export function commandForKey(key: string): Command | null {
  return sorted.find((command) => command.keys.includes(key)) ?? null;
}

export function useCommands(): Command[] {
  return useSyncExternalStore(subscribe, () => sorted, () => EMPTY);
}

export function useCommand(spec: CommandSpec | null, run: () => void): void {
  const latestRun = useRef(run);
  latestRun.current = run;
  useEffect(() => {
    if (spec === null) return;
    return registerCommand({ ...spec, run: () => latestRun.current() });
  }, [spec]);
}
