'use client';

import { useCallback, useEffect } from 'react';
import { BLANK_SESSION, readSession, updateSession, useChatSession, type ChatSession } from './aiChatStore';
import { CURSOR_AGENT_PATH, CURSOR_RUN_PATH } from './aiChatPaths';
import { appendEntry, entryId } from './chatEntries';
import { followOnce } from './followRun';
import { cursorHeaders, useCursorKey } from './cursorKeyStore';
import { runFinished, WARMUP_PROMPT, type CursorLaunch, type CursorRun } from './cursorTypes';
import { useCursorAccount, type CursorAccount } from './useCursorModels';
import { apiKeyedPost } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';

export interface AiChatTarget {
  subject: string;
  owner: string;
  repo: string;
  headRef: string | null;
  active: boolean;
}

export interface AiChat {
  session: ChatSession;
  account: CursorAccount;
  model: string | null;
  busy: boolean;
  send: (text: string) => void;
  restart: (model: string | null) => void;
}

export function useAiChat({ subject, owner, repo, headRef, active }: AiChatTarget): AiChat {
  const key = useCursorKey();
  const session = useChatSession(subject);
  const account = useCursorAccount(key);
  const model = session.model ?? account.defaultModel;

  useWarmUpOnOpen({ subject, owner, repo, headRef, key, model, active });
  useFollowActiveRun(subject, key, session);
  useQueuedPrompt(subject, key, session);

  const send = useCallback((text: string) => queuePrompt(subject, text), [subject]);
  const restart = useCallback((next: string | null) => updateSession(subject, { ...BLANK_SESSION, model: next }), [subject]);

  return { session, account, model, busy: !runFinished(session.status) || session.launching, send, restart };
}

interface WarmUp {
  subject: string;
  owner: string;
  repo: string;
  headRef: string | null;
  key: string | null;
  model: string | null;
  active: boolean;
}

function useWarmUpOnOpen({ subject, owner, repo, headRef, key, model, active }: WarmUp): void {
  useEffect(() => {
    if (!active || key === null || headRef === null || model === null) return;
    void warmUp({ subject, owner, repo, ref: headRef, key, model });
  }, [active, key, headRef, model, subject, owner, repo]);
}

function useFollowActiveRun(subject: string, key: string | null, { agentId, runId }: ChatSession): void {
  useEffect(() => {
    if (key !== null && agentId !== null && runId !== null) followOnce(subject, key, agentId, runId);
  }, [key, subject, agentId, runId]);
}

function useQueuedPrompt(subject: string, key: string | null, session: ChatSession): void {
  const { agentId, queued, status, launching } = session;
  useEffect(() => {
    if (key === null || agentId === null || queued === null || launching || !runFinished(status)) return;
    void sendQueued(subject, key, agentId, queued);
  }, [key, subject, agentId, queued, status, launching]);
}

function queuePrompt(subject: string, text: string): void {
  updateSession(subject, (held) => ({
    error: null,
    queued: held.queued === null ? text : `${held.queued}\n\n${text}`,
    entries: appendEntry(held.entries, { id: entryId(), kind: 'user', text }),
  }));
}

interface Launch {
  subject: string;
  owner: string;
  repo: string;
  ref: string;
  key: string;
  model: string;
}

async function warmUp(launch: Launch): Promise<void> {
  const { subject, key, ref, model } = launch;
  const held = readSession(subject);
  if (held.agentId !== null || held.launching) return;
  updateSession(subject, {
    launching: true,
    model,
    error: null,
    entries: appendEntry(held.entries, { id: entryId(), kind: 'notice', text: `Starting a cloud agent on ${ref}…` }),
  });
  try {
    updateSession(subject, launched(await requestAgent(launch, key)));
  } catch (error) {
    updateSession(subject, { launching: false, error: errorMessage(error) });
  }
}

function requestAgent({ subject, owner, repo, ref, model }: Launch, key: string): Promise<CursorLaunch> {
  return apiKeyedPost<CursorLaunch>(CURSOR_AGENT_PATH, cursorHeaders(key), {
    owner,
    repo,
    ref,
    model,
    prompt: WARMUP_PROMPT,
    name: `Shoggoth Reviews · ${subject}`,
  });
}

function launched({ agent, run }: CursorLaunch): Partial<ChatSession> {
  return { launching: false, agentId: agent.id, agentUrl: agent.url ?? null, runId: run.id, status: run.status };
}

async function sendQueued(subject: string, key: string, agentId: string, prompt: string): Promise<void> {
  if (readSession(subject).queued !== prompt) return;
  updateSession(subject, { queued: null, error: null, status: 'CREATING' });
  try {
    const run = await apiKeyedPost<CursorRun>(CURSOR_RUN_PATH, cursorHeaders(key), { agent: agentId, prompt });
    updateSession(subject, { runId: run.id, status: run.status });
  } catch (error) {
    updateSession(subject, { status: 'ERROR', error: errorMessage(error) });
  }
}
