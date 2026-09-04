'use client';

import { useSyncExternalStore } from 'react';
import type { ChatEntry } from './chatEntries';

export interface ChatSession {
  agentId: string | null;
  agentUrl: string | null;
  runId: string | null;
  status: string | null;
  model: string | null;
  entries: ChatEntry[];
  error: string | null;
  launching: boolean;
  queued: string | null;
  resulted: string | null;
}

export const BLANK_SESSION: ChatSession = {
  agentId: null,
  agentUrl: null,
  runId: null,
  status: null,
  model: null,
  entries: [],
  error: null,
  launching: false,
  queued: null,
  resulted: null,
};

const sessions = new Map<string, ChatSession>();
const activeThreads = new Map<string, string>();
const listeners = new Set<() => void>();

export function readSession(thread: string | null): ChatSession {
  if (thread === null) return BLANK_SESSION;
  return sessions.get(thread) ?? BLANK_SESSION;
}

export function updateSession(thread: string, change: Partial<ChatSession> | ((held: ChatSession) => Partial<ChatSession>)): void {
  const held = readSession(thread);
  sessions.set(thread, { ...held, ...(typeof change === 'function' ? change(held) : change) });
  notify();
}

export function useChatSession(thread: string | null): ChatSession {
  return useSyncExternalStore(
    subscribeSessions,
    () => readSession(thread),
    () => BLANK_SESSION,
  );
}

export function readActiveThread(subject: string): string | null {
  return activeThreads.get(subject) ?? null;
}

export function setActiveThread(subject: string, thread: string): void {
  activeThreads.set(subject, thread);
  notify();
}

export function useActiveThread(subject: string): string | null {
  return useSyncExternalStore(
    subscribeSessions,
    () => readActiveThread(subject),
    () => null,
  );
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
