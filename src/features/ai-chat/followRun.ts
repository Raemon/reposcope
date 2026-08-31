'use client';

import { readSession, updateSession } from './aiChatStore';
import { cursorRunPath, cursorRunStreamPath } from './aiChatPaths';
import { cursorHeaders } from './cursorKeyStore';
import { applyError, applyRun, applyRunEvent } from './runEvents';
import { describeFailure, runFinished, type CursorRun } from './cursorTypes';
import { sseEvents } from './sseEvents';
import { apiKeyedJson, apiKeyedStream } from '@/features/sources/apiClient';

const POLL_MS = 3000;

export async function followRun(subject: string, key: string, agentId: string, runId: string, signal: AbortSignal): Promise<void> {
  try {
    await streamInto(subject, key, agentId, runId, signal);
  } catch {
    if (signal.aborted) return;
  }
  if (signal.aborted || runFinished(readSession(subject).status)) return;
  await pollUntilFinished(subject, key, agentId, runId, signal);
}

async function streamInto(subject: string, key: string, agentId: string, runId: string, signal: AbortSignal): Promise<void> {
  const response = await apiKeyedStream(cursorRunStreamPath(agentId, runId), cursorHeaders(key), signal);
  if (response.body === null) return;
  for await (const event of sseEvents(response.body)) {
    if (signal.aborted) return;
    applyRunEvent(subject, runId, event);
  }
}

async function pollUntilFinished(subject: string, key: string, agentId: string, runId: string, signal: AbortSignal): Promise<void> {
  while (!signal.aborted) {
    try {
      const run = await apiKeyedJson<CursorRun>(cursorRunPath(agentId, runId), cursorHeaders(key), signal);
      applyRun(subject, run);
      if (runFinished(run.status)) return;
    } catch (error) {
      if (signal.aborted) return;
      return applyError(subject, describeFailure(error));
    }
    await pause(POLL_MS, signal);
  }
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function claimFollow(subject: string, runId: string): boolean {
  if (readSession(subject).followed === runId) return false;
  updateSession(subject, { followed: runId });
  return true;
}
