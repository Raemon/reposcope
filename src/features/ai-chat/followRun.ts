'use client';

import { readSession } from './aiChatStore';
import { cursorRunPath, cursorRunStreamPath } from './aiChatPaths';
import { cursorHeaders } from './cursorKeyStore';
import { applyError, applyRun, applyRunEvent } from './runEvents';
import { describeFailure, runFinished, LAST_EVENT_ID_HEADER, STREAM_EXPIRED_STATUS, type CursorRun } from './cursorTypes';
import { sseEvents } from './sseEvents';
import { apiKeyedJson, apiKeyedStream, failureStatus } from '@/features/sources/apiClient';

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
  // A stream that ends without a result leaves polling as the only way to finish the run.
  if (stillShowing(subject, runId) && readSession(subject).resulted !== runId) {
    await pollUntilFinished(subject, key, agentId, runId);
  }
}

// Cursor refuses the stream of a run it has not started yet, and replays one in full once it has.
async function streamWithRetry(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  const resume: Resume = { lastEventId: null, before: readSession(subject).entries.length };
  for (let attempt = 1; attempt <= STREAM_TRIES; attempt += 1) {
    try {
      return await streamInto(subject, key, agentId, runId, resume);
    } catch (error) {
      if (attempt === STREAM_TRIES || !worthRetrying(subject, error, resume)) return;
      await pause(RETRY_MS);
    }
  }
}

interface Resume {
  lastEventId: string | null;
  before: number;
}

// An expired stream never comes back, and replaying without a resume point doubles entries.
function worthRetrying(subject: string, error: unknown, resume: Resume): boolean {
  if (failureStatus(error) === STREAM_EXPIRED_STATUS) return false;
  return resume.lastEventId !== null || readSession(subject).entries.length === resume.before;
}

async function streamInto(subject: string, key: string, agentId: string, runId: string, resume: Resume): Promise<void> {
  const response = await apiKeyedStream(cursorRunStreamPath(agentId, runId), streamHeaders(key, resume));
  if (response.body === null) return;
  for await (const event of sseEvents(response.body)) {
    if (!stillShowing(subject, runId)) return;
    if (event.id !== null) resume.lastEventId = event.id;
    if (event.event === 'error') throw new Error(event.data);
    applyRunEvent(subject, runId, event);
  }
}

function streamHeaders(key: string, { lastEventId }: Resume): Record<string, string> {
  const headers = cursorHeaders(key);
  return lastEventId === null ? headers : { ...headers, [LAST_EVENT_ID_HEADER]: lastEventId };
}

async function pollUntilFinished(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  while (stillShowing(subject, runId)) {
    try {
      const run = await apiKeyedJson<CursorRun>(cursorRunPath(agentId, runId), cursorHeaders(key));
      applyRun(subject, run);
      if (runFinished(run.status)) return;
    } catch (error) {
      return applyError(subject, describeFailure(error));
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
