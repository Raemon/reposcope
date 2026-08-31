'use client';

import { useCallback, useEffect } from 'react';
import { readSession, updateSession, type ChatSession } from './aiChatStore';
import { BLANK_SESSION, useChatSession } from './aiChatStore';
import { CURSOR_AGENT_PATH, CURSOR_RUN_PATH } from './aiChatPaths';
import { appendEntry, entryId } from './chatEntries';
import { claimFollow, followRun } from './followRun';
import { cursorHeaders, useCursorKey } from './cursorKeyStore';
import { describeFailure, runFinished, WARMUP_PROMPT, type CursorLaunch, type CursorRun } from './cursorTypes';
import { useCursorAccount, type CursorAccount } from './useCursorModels';
import { apiKeyedPost } from '@/features/sources/apiClient';

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

  useEffect(() => {
    if (!active || key === null || headRef === null || model === null) return;
    void warmUp({ subject, owner, repo, ref: headRef, key, model });
  }, [active, key, headRef, model, subject, owner, repo]);

  useEffect(() => {
    const { agentId, runId } = session;
    if (key === null || agentId === null || runId === null || !claimFollow(subject, runId)) return;
    const abort = new AbortController();
    void followRun(subject, key, agentId, runId, abort.signal);
    return () => abort.abort();
  }, [key, subject, session.agentId, session.runId, session.followed]);

  useEffect(() => {
    const { agentId, queued, status, launching } = session;
    if (key === null || agentId === null || queued === null || launching || !runFinished(status)) return;
    void sendQueued(subject, key, agentId, queued);
  }, [key, subject, session.agentId, session.queued, session.status, session.launching]);

  const send = useCallback(
    (text: string) => {
      updateSession(subject, (held) => ({
        error: null,
        queued: held.queued === null ? text : `${held.queued}\n\n${text}`,
        entries: appendEntry(held.entries, { id: entryId(), kind: 'user', text }),
      }));
    },
    [subject],
  );

  const restart = useCallback((next: string | null) => updateSession(subject, { ...BLANK_SESSION, model: next }), [subject]);

  return { session, account, model, busy: !runFinished(session.status) || session.launching, send, restart };
}

interface WarmUp extends Omit<AiChatTarget, 'headRef' | 'active'> {
  ref: string;
  key: string;
  model: string;
}

async function warmUp({ subject, owner, repo, ref, key, model }: WarmUp): Promise<void> {
  const held = readSession(subject);
  if (held.agentId !== null || held.launching) return;
  updateSession(subject, {
    launching: true,
    model,
    error: null,
    entries: appendEntry(held.entries, { id: entryId(), kind: 'notice', text: `Starting a cloud agent on ${ref}…` }),
  });
  try {
    const launch = await apiKeyedPost<CursorLaunch>(CURSOR_AGENT_PATH, cursorHeaders(key), {
      owner,
      repo,
      ref,
      model,
      prompt: WARMUP_PROMPT,
      name: `Shoggoth Reviews · ${subject}`,
    });
    updateSession(subject, {
      launching: false,
      agentId: launch.agent.id,
      agentUrl: launch.agent.url ?? null,
      runId: launch.run.id,
      status: launch.run.status,
    });
  } catch (error) {
    updateSession(subject, { launching: false, error: describeFailure(error) });
  }
}

async function sendQueued(subject: string, key: string, agentId: string, prompt: string): Promise<void> {
  if (readSession(subject).queued !== prompt) return;
  updateSession(subject, { queued: null, error: null, status: 'CREATING' });
  try {
    const run = await apiKeyedPost<CursorRun>(CURSOR_RUN_PATH, cursorHeaders(key), { agent: agentId, prompt });
    updateSession(subject, { runId: run.id, status: run.status });
  } catch (error) {
    updateSession(subject, { status: 'ERROR', error: describeFailure(error) });
  }
}
