'use client';

import { appendEntry, entryId, replaceTool, type ChatEntry } from './chatEntries';
import { readSession, updateSession } from './aiChatStore';
import { runFinished, type CursorBranch, type CursorRun } from './cursorTypes';
import type { SseEvent } from './sseEvents';
import { dispatchQueued } from './startThread';
import { reloadCurrentPull } from '@/features/pull-requests/currentPullStore';

const DETAIL_LIMIT = 80;

export function applyRunEvent(thread: string, runId: string, { event, data }: SseEvent): void {
  const payload = parsePayload(data);
  if (event === 'assistant' || event === 'thinking') return addEntry(thread, { id: entryId(), kind: event, text: textOf(payload) });
  if (event === 'tool_call') return addTool(thread, payload);
  if (event === 'status') return updateSession(thread, { status: stringOf(payload, 'status') ?? readSession(thread).status });
  if (event === 'result') return applyResult(thread, runId, payload);
}

export function applyRun(thread: string, run: CursorRun): void {
  updateSession(thread, { status: run.status });
  if (runFinished(run.status)) applyResult(thread, run.id, { status: run.status, text: run.result ?? '', git: run.git });
}

export function applyError(thread: string, message: string): void {
  updateSession(thread, (held) => ({
    status: 'ERROR',
    error: message,
    entries: appendEntry(held.entries, { id: entryId(), kind: 'error', text: message }),
  }));
}

function applyResult(thread: string, runId: string, payload: Record<string, unknown>): void {
  const held = readSession(thread);
  if (held.resulted === runId) return;
  const branch = firstBranch(payload);
  updateSession(thread, {
    resulted: runId,
    status: stringOf(payload, 'status') ?? 'FINISHED',
    entries: appendEntry(held.entries, {
      id: entryId(),
      kind: 'result',
      text: textOf(payload) || 'Done.',
      branch: branch?.branch ?? null,
      prUrl: branch?.prUrl ?? null,
    }),
  });
  void reloadCurrentPull();
  void dispatchQueued(thread);
}

function addEntry(thread: string, entry: ChatEntry): void {
  updateSession(thread, (held) => ({ entries: appendEntry(held.entries, entry) }));
}

function addTool(thread: string, payload: Record<string, unknown>): void {
  const entry = {
    id: stringOf(payload, 'callId') ?? entryId(),
    kind: 'tool' as const,
    name: stringOf(payload, 'name') ?? 'tool',
    detail: toolDetail(payload.args),
    done: stringOf(payload, 'status') === 'completed',
  };
  updateSession(thread, (held) => ({ entries: replaceTool(held.entries, entry) }));
}

function toolDetail(args: unknown): string {
  if (args === null || typeof args !== 'object') return '';
  const values = Object.values(args as Record<string, unknown>);
  const named = values.find((value) => typeof value === 'string') ?? JSON.stringify(args);
  return clip(String(named ?? ''));
}

function clip(text: string): string {
  return text.length > DETAIL_LIMIT ? `${text.slice(0, DETAIL_LIMIT)}…` : text;
}

function firstBranch(payload: Record<string, unknown>): CursorBranch | null {
  const git = payload.git as { branches?: CursorBranch[] } | null | undefined;
  return git?.branches?.[0] ?? null;
}

function textOf(payload: Record<string, unknown>): string {
  return stringOf(payload, 'text') ?? stringOf(payload, 'result') ?? stringOf(payload, 'message') ?? '';
}

function stringOf(payload: Record<string, unknown>, name: string): string | null {
  const value = payload[name];
  return typeof value === 'string' ? value : null;
}

function parsePayload(data: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : { text: data };
  } catch {
    return { text: data };
  }
}
