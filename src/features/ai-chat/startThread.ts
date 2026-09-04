'use client';

import { readSession, setActiveThread, updateSession } from './aiChatStore';
import { CURSOR_AGENT_PATH, CURSOR_RUN_PATH } from './aiChatPaths';
import { appendEntry, entryId, type ChatEntry } from './chatEntries';
import { forgetThread, newThreadKey, rememberThread, threadName, updateThread, type ChatThread, type ThreadPurpose, type ThreadTarget } from './chatThreads';
import { cursorHeaders, readCursorKey } from './cursorKeyStore';
import { runFinished, WARMUP_PROMPT, type CursorLaunch, type CursorRun } from './cursorTypes';
import { pullUrl } from '@/features/pull-requests/pullPaths';
import { apiKeyedPost } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';

export interface ThreadLaunch extends ThreadTarget {
  cursorKey: string;
  model: string | null;
  purpose: ThreadPurpose;
  prompt: string | null;
}

export function startThread(launch: ThreadLaunch): string {
  const thread = describeThread(launch);
  rememberThread(thread);
  setActiveThread(launch.subject, thread.key);
  updateSession(thread.key, { launching: true, model: launch.model, entries: openingEntries(launch) });
  void launchAgent(thread, launch);
  return thread.key;
}

export function queuePrompt(thread: string, text: string): void {
  updateSession(thread, (held) => ({
    error: null,
    queued: held.queued === null ? text : `${held.queued}\n\n${text}`,
    entries: appendEntry(held.entries, { id: entryId(), kind: 'user', text }),
  }));
  void dispatchQueued(thread);
}

// Also called from run events, so queued text sends while the thread is off screen.
export async function dispatchQueued(thread: string): Promise<void> {
  const { agentId, queued, status, launching } = readSession(thread);
  const key = readCursorKey();
  if (key === null || agentId === null || queued === null || launching || !runFinished(status)) return;
  updateSession(thread, { queued: null, error: null, status: 'CREATING' });
  try {
    const run = await apiKeyedPost<CursorRun>(CURSOR_RUN_PATH, cursorHeaders(key), { agent: agentId, prompt: queued });
    updateSession(thread, { runId: run.id, status: run.status });
    updateThread(thread, { runId: run.id });
  } catch (error) {
    updateSession(thread, { status: 'ERROR', error: errorMessage(error) });
  }
}

export function restoreThread(thread: ChatThread): void {
  const held = readSession(thread.key);
  if (held.agentId !== null || held.launching || thread.agentId === null) return;
  updateSession(thread.key, { agentId: thread.agentId, agentUrl: thread.agentUrl, runId: thread.runId, model: thread.model });
}

function describeThread({ cursorKey: _key, prompt: _prompt, ...held }: ThreadLaunch): ChatThread {
  return { ...held, key: newThreadKey(), agentId: null, agentUrl: null, runId: null, createdAt: new Date().toISOString() };
}

function openingEntries({ headRef, prompt }: ThreadLaunch): ChatEntry[] {
  const notice: ChatEntry = { id: entryId(), kind: 'notice', text: `Starting a cloud agent on ${headRef}…` };
  return prompt === null ? [notice] : [{ id: entryId(), kind: 'user', text: prompt }, notice];
}

async function launchAgent(thread: ChatThread, launch: ThreadLaunch): Promise<void> {
  try {
    settleLaunch(thread.key, await apiKeyedPost<CursorLaunch>(CURSOR_AGENT_PATH, cursorHeaders(launch.cursorKey), launchBody(thread, launch)));
  } catch (error) {
    forgetThread(thread.key);
    updateSession(thread.key, { launching: false, error: errorMessage(error) });
  }
}

function settleLaunch(thread: string, { agent, run }: CursorLaunch): void {
  const agentUrl = agent.url ?? null;
  updateSession(thread, { launching: false, agentId: agent.id, agentUrl, runId: run.id, status: run.status });
  updateThread(thread, { agentId: agent.id, agentUrl, runId: run.id });
}

function launchBody(thread: ChatThread, { owner, repo, number, headRef, model, prompt }: ThreadLaunch) {
  return {
    owner,
    repo,
    ref: headRef,
    prUrl: number === null ? null : pullUrl(owner, repo, number),
    model,
    prompt: prompt ?? WARMUP_PROMPT,
    name: threadName(thread),
  };
}
