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
  followed: string | null;
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
  followed: null,
};

const sessions = new Map<string, ChatSession>();
const listeners = new Set<() => void>();

export function readSession(subject: string): ChatSession {
  return sessions.get(subject) ?? BLANK_SESSION;
}

export function updateSession(subject: string, change: Partial<ChatSession> | ((held: ChatSession) => Partial<ChatSession>)): void {
  const held = readSession(subject);
  sessions.set(subject, { ...held, ...(typeof change === 'function' ? change(held) : change) });
  for (const listener of listeners) listener();
}

export function useChatSession(subject: string): ChatSession {
  return useSyncExternalStore(
    subscribe,
    () => readSession(subject),
    () => BLANK_SESSION,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
