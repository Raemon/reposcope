'use client';

import { appendEntry, entryId, replaceTool, type ChatEntry } from './chatEntries';
import { readSession, updateSession } from './aiChatStore';
import type { CursorBranch, CursorRun } from './cursorTypes';
import type { SseEvent } from './sseEvents';

const DETAIL_LIMIT = 80;

export function applyRunEvent(subject: string, runId: string, { event, data }: SseEvent): void {
  const payload = parsePayload(data);
  if (event === 'assistant' || event === 'thinking') return addEntry(subject, { id: entryId(), kind: event, text: textOf(payload) });
  if (event === 'tool_call') return addTool(subject, payload);
  if (event === 'status') return updateSession(subject, { status: stringOf(payload, 'status') ?? readSession(subject).status });
  if (event === 'result') return applyResult(subject, runId, payload);
  if (event === 'error') return applyError(subject, textOf(payload) || 'The agent reported an error.');
}

export function applyRun(subject: string, run: CursorRun): void {
  updateSession(subject, { status: run.status });
  if (run.status.toUpperCase() === 'FINISHED') applyResult(subject, run.id, run as unknown as Record<string, unknown>);
}

export function applyError(subject: string, message: string): void {
  updateSession(subject, (held) => ({
    status: 'ERROR',
    error: message,
    entries: appendEntry(held.entries, { id: entryId(), kind: 'error', text: message }),
  }));
}

function applyResult(subject: string, runId: string, payload: Record<string, unknown>): void {
  const held = readSession(subject);
  if (held.resulted === runId) return;
  const branch = firstBranch(payload);
  updateSession(subject, {
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
}

function addEntry(subject: string, entry: ChatEntry): void {
  updateSession(subject, (held) => ({ entries: appendEntry(held.entries, entry) }));
}

function addTool(subject: string, payload: Record<string, unknown>): void {
  const entry = {
    id: stringOf(payload, 'callId') ?? entryId(),
    kind: 'tool' as const,
    name: stringOf(payload, 'name') ?? 'tool',
    detail: toolDetail(payload.args),
    done: stringOf(payload, 'status') === 'completed',
  };
  updateSession(subject, (held) => ({ entries: replaceTool(held.entries, entry) }));
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
