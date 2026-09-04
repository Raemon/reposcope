'use client';

import { useCallback, useEffect, useState } from 'react';
import { readActiveThread, setActiveThread, useActiveThread, useChatSession, type ChatSession } from './aiChatStore';
import { cursorAgentsPath } from './aiChatPaths';
import { adoptCursorAgents, latestThreadFor, useSubjectThreads, type ChatThread, type ThreadPurpose, type ThreadTarget } from './chatThreads';
import { followOnce } from './followRun';
import { cursorHeaders, useCursorKey } from './cursorKeyStore';
import { runFinished, type CursorAgent } from './cursorTypes';
import { dispatchQueued, queuePrompt, restoreThread, startThread } from './startThread';
import { useCursorAccount, type CursorAccount } from './useCursorModels';
import { pullUrl } from '@/features/pull-requests/pullPaths';
import { apiKeyedJson } from '@/features/sources/apiClient';

export interface AiChatTarget extends Omit<ThreadTarget, 'headRef'> {
  headRef: string | null;
  active: boolean;
}

export interface AiChat {
  session: ChatSession;
  account: CursorAccount;
  model: string | null;
  busy: boolean;
  threads: ChatThread[];
  thread: string | null;
  send: (text: string) => void;
  restart: (model: string | null) => void;
  select: (thread: string) => void;
}

type Launch = (purpose: ThreadPurpose, prompt: string | null, model: string | null) => void;

export function useAiChat(target: AiChatTarget): AiChat {
  const { subject, active } = target;
  const key = useCursorKey();
  const { threads, thread, current } = useCurrentThread(subject);
  const session = useChatSession(thread);
  const account = useCursorAccount(key);
  const model = session.model ?? account.defaultModel;
  const launch = useLaunch(target, key);
  const adopted = useAdoptCursorThreads(target, key);

  useWarmUpOnOpen(subject, active && adopted && thread === null && model !== null, launch, model);
  useRestoreThread(current);
  useFollowActiveRun(thread, key, session);
  useDispatchQueued(thread, session);

  const unlaunched = session.agentId === null && !session.launching;
  const send = useCallback(
    (text: string) => (thread === null || unlaunched ? launch('chat', text, model) : queuePrompt(thread, text)),
    [thread, unlaunched, launch, model],
  );
  const restart = useCallback((next: string | null) => launch('chat', null, next), [launch]);
  const select = useCallback((next: string) => setActiveThread(subject, next), [subject]);

  return { session, account, model, busy: !runFinished(session.status) || session.launching, threads, thread, send, restart, select };
}

function useCurrentThread(subject: string): { threads: ChatThread[]; thread: string | null; current: ChatThread | null } {
  const threads = useSubjectThreads(subject);
  const chosen = useActiveThread(subject);
  const thread = chosen ?? threads[threads.length - 1]?.key ?? null;
  return { threads, thread, current: threads.find((held) => held.key === thread) ?? null };
}

function useLaunch({ subject, owner, repo, number, headRef, headSha }: AiChatTarget, key: string | null): Launch {
  return useCallback(
    (purpose, prompt, model) => {
      if (key === null || headRef === null) return;
      startThread({ subject, owner, repo, number, headRef, headSha, cursorKey: key, model, purpose, prompt });
    },
    [key, subject, owner, repo, number, headRef, headSha],
  );
}

function useWarmUpOnOpen(subject: string, wanted: boolean, launch: Launch, model: string | null): void {
  useEffect(() => {
    if (wanted && readActiveThread(subject) === null && latestThreadFor(subject) === null) launch('chat', null, model);
  }, [subject, wanted, launch, model]);
}

// Adoption settles before warm-up, so an agent Cursor already has for this PR is reused.
function useAdoptCursorThreads({ subject, owner, repo, number, headRef, active }: AiChatTarget, key: string | null): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!active || key === null || number === null || headRef === null) return setSettled(number === null);
    setSettled(false);
    apiKeyedJson<{ items: CursorAgent[] }>(cursorAgentsPath(pullUrl(owner, repo, number)), cursorHeaders(key))
      .then(({ items }) => adoptCursorAgents(items, { subject, owner, repo, number, headRef, headSha: null }))
      .catch(() => undefined)
      .finally(() => setSettled(true));
  }, [active, key, subject, owner, repo, number, headRef]);
  return settled;
}

function useRestoreThread(thread: ChatThread | null): void {
  useEffect(() => {
    if (thread !== null) restoreThread(thread);
  }, [thread]);
}

function useFollowActiveRun(thread: string | null, key: string | null, { agentId, runId }: ChatSession): void {
  useEffect(() => {
    if (thread !== null && key !== null && agentId !== null && runId !== null) followOnce(thread, key, agentId, runId);
  }, [key, thread, agentId, runId]);
}

function useDispatchQueued(thread: string | null, { agentId, queued, status, launching }: ChatSession): void {
  useEffect(() => {
    if (thread !== null) void dispatchQueued(thread);
  }, [thread, agentId, queued, status, launching]);
}
