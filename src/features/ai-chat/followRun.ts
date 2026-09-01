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
export function followOnce(subject: string, key: string, agentId: string, runId: string): void {
  if (followed.has(runId)) return;
  followed.add(runId);
  void follow(subject, key, agentId, runId);
}

async function follow(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  await streamWithRetry(subject, key, agentId, runId);
  if (stillShowing(subject, runId) && !runFinished(readSession(subject).status)) {
    await pollUntilFinished(subject, key, agentId, runId);
  }
}

// Cursor refuses the stream of a run it has not started yet, and replays one in full once it has.
async function streamWithRetry(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  const before = readSession(subject).entries.length;
  for (let attempt = 1; attempt <= STREAM_TRIES; attempt += 1) {
    try {
      return await streamInto(subject, key, agentId, runId);
    } catch {
      if (attempt === STREAM_TRIES || replayWouldDuplicate(subject, before)) return;
      await pause(RETRY_MS);
    }
  }
}

function replayWouldDuplicate(subject: string, before: number): boolean {
  return readSession(subject).entries.length !== before;
}

async function streamInto(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  const response = await apiKeyedStream(cursorRunStreamPath(agentId, runId), cursorHeaders(key));
  if (response.body === null) return;
  for await (const event of sseEvents(response.body)) {
    if (!stillShowing(subject, runId)) return;
    if (event.event === 'error') throw new Error(event.data);
    applyRunEvent(subject, runId, event);
  }
}

async function pollUntilFinished(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  while (stillShowing(subject, runId)) {
    try {
      const run = await apiKeyedJson<CursorRun>(cursorRunPath(agentId, runId), cursorHeaders(key));
      applyRun(subject, run);
      if (runFinished(run.status)) return;
    } catch (error) {
      return applyError(subject, errorMessage(error));
    }
    await pause(POLL_MS);
  }
}

function stillShowing(subject: string, runId: string): boolean {
  return readSession(subject).runId === runId;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
