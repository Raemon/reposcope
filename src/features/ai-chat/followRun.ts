'use client';

import { readSession } from './aiChatStore';
import { cursorRunPath, cursorRunStreamPath } from './aiChatPaths';
import { cursorHeaders } from './cursorKeyStore';
import { applyError, applyRun, applyRunEvent } from './runEvents';
import { runFinished, type CursorRun } from './cursorTypes';
import { sseEvents } from './sseEvents';
import { apiKeyedJson, apiKeyedStream } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';

const POLL_MS = 3000;
const STREAM_TRIES = 3;
const RETRY_MS = 2000;

const followed = new Set<string>();

// Following outlives the column: unmounting on collapse must not abort a live run.
export function followOnce(thread: string, key: string, agentId: string, runId: string): void {
  if (followed.has(runId)) return;
  followed.add(runId);
  void follow(thread, key, agentId, runId);
}

async function follow(thread: string, key: string, agentId: string, runId: string): Promise<void> {
  await streamWithRetry(thread, key, agentId, runId);
  if (stillShowing(thread, runId) && !runFinished(readSession(thread).status)) {
    await pollUntilFinished(thread, key, agentId, runId);
  }
}

// Cursor refuses the stream of a run it has not started yet, and replays one in full once it has.
async function streamWithRetry(thread: string, key: string, agentId: string, runId: string): Promise<void> {
  const before = readSession(thread).entries.length;
  for (let attempt = 1; attempt <= STREAM_TRIES; attempt += 1) {
    try {
      return await streamInto(thread, key, agentId, runId);
    } catch {
      if (attempt === STREAM_TRIES || replayWouldDuplicate(thread, before)) return;
      await pause(RETRY_MS);
    }
  }
}

function replayWouldDuplicate(thread: string, before: number): boolean {
  return readSession(thread).entries.length !== before;
}

async function streamInto(thread: string, key: string, agentId: string, runId: string): Promise<void> {
  const response = await apiKeyedStream(cursorRunStreamPath(agentId, runId), cursorHeaders(key));
  if (response.body === null) return;
  for await (const event of sseEvents(response.body)) {
    if (!stillShowing(thread, runId)) return;
    if (event.event === 'error') throw new Error(event.data);
    applyRunEvent(thread, runId, event);
  }
}

async function pollUntilFinished(thread: string, key: string, agentId: string, runId: string): Promise<void> {
  while (stillShowing(thread, runId)) {
    try {
      const run = await apiKeyedJson<CursorRun>(cursorRunPath(agentId, runId), cursorHeaders(key));
      applyRun(thread, run);
      if (runFinished(run.status)) return;
    } catch (error) {
      return applyError(thread, errorMessage(error));
    }
    await pause(POLL_MS);
  }
}

function stillShowing(thread: string, runId: string): boolean {
  return readSession(thread).runId === runId;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
