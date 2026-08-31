'use client';

import { readSession } from './aiChatStore';
import { cursorRunPath, cursorRunStreamPath } from './aiChatPaths';
import { cursorHeaders } from './cursorKeyStore';
import { applyError, applyRun, applyRunEvent } from './runEvents';
import { describeFailure, runFinished, type CursorRun } from './cursorTypes';
import { sseEvents } from './sseEvents';
import { apiKeyedJson, apiKeyedStream } from '@/features/sources/apiClient';

const POLL_MS = 3000;

const followed = new Set<string>();

// Following outlives the column: unmounting on collapse must not abort a live run.
export function followOnce(subject: string, key: string, agentId: string, runId: string): void {
  if (followed.has(runId)) return;
  followed.add(runId);
  void follow(subject, key, agentId, runId);
}

async function follow(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  try {
    await streamInto(subject, key, agentId, runId);
  } catch {
    // A dropped stream is recoverable; the status poll below carries the run to its end.
  }
  if (stillShowing(subject, runId) && !runFinished(readSession(subject).status)) {
    await pollUntilFinished(subject, key, agentId, runId);
  }
}

async function streamInto(subject: string, key: string, agentId: string, runId: string): Promise<void> {
  const response = await apiKeyedStream(cursorRunStreamPath(agentId, runId), cursorHeaders(key));
  if (response.body === null) return;
  for await (const event of sseEvents(response.body)) {
    if (!stillShowing(subject, runId)) return;
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
