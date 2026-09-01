import type { CursorLaunch, CursorModel, CursorRun, CursorSessionInfo, FollowupRequest, LaunchRequest } from './cursorTypes';

const CURSOR_API = process.env.CURSOR_API_URL ?? 'https://api.cursor.com';

export class CursorError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface Call {
  method?: string;
  body?: unknown;
  accept?: string;
  headers?: Record<string, string>;
}

async function cursorFetch(key: string, path: string, call: Call = {}): Promise<Response> {
  const response = await fetch(`${CURSOR_API}${path}`, {
    method: call.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(call.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(call.accept === undefined ? {} : { Accept: call.accept }),
      ...call.headers,
    },
    body: call.body === undefined ? undefined : JSON.stringify(call.body),
    cache: 'no-store',
  });
  if (!response.ok) throw new CursorError(response.status, await failureOf(response));
  return response;
}

async function cursorJson<T>(key: string, path: string, call: Call = {}): Promise<T> {
  return (await cursorFetch(key, path, call)).json() as Promise<T>;
}

export async function describeSession(key: string): Promise<CursorSessionInfo> {
  const [account, models] = await Promise.all([readAccount(key), listModels(key)]);
  return { account, models };
}

export async function launchAgent(key: string, ask: LaunchRequest): Promise<CursorLaunch> {
  const launched = await cursorJson<CursorLaunch>(key, '/v1/agents', { method: 'POST', body: launchBody(ask) });
  return { ...launched, run: runOf(launched.run) };
}

export async function startFollowup(key: string, { agentId, prompt }: FollowupRequest): Promise<CursorRun> {
  return runOf(
    await cursorJson<unknown>(key, `/v1/agents/${encodeURIComponent(agentId)}/runs`, {
      method: 'POST',
      body: { prompt: { text: prompt }, mode: 'agent' },
    }),
  );
}

export async function readRun(key: string, agentId: string, runId: string): Promise<CursorRun> {
  return runOf(await cursorJson<unknown>(key, runPath(agentId, runId)));
}

// Cursor wraps the run in `{ run }` when starting one but returns it bare when reading it.
function runOf(body: unknown): CursorRun {
  const held = (body ?? {}) as { run?: unknown };
  const run = (held.run ?? body ?? {}) as Partial<CursorRun>;
  return { ...run, id: text(run.id), agentId: text(run.agentId), status: optionalText(run.status) };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export async function streamRun(key: string, agentId: string, runId: string, lastEventId: string | null): Promise<Response> {
  return cursorFetch(key, `${runPath(agentId, runId)}/stream`, {
    accept: 'text/event-stream',
    headers: lastEventId === null ? {} : { 'Last-Event-ID': lastEventId },
  });
}

function runPath(agentId: string, runId: string): string {
  return `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`;
}

// Commits go to the PR's head branch, so agent work lands in the diff under review.
function launchBody({ owner, repo, ref, prompt, model, name }: LaunchRequest) {
  return {
    prompt: { text: prompt },
    ...(model === null ? {} : { model: { id: model } }),
    repos: [{ url: `https://github.com/${owner}/${repo}`, ...(ref === null ? {} : { startingRef: ref }) }],
    name,
    autoCreatePR: false,
    workOnCurrentBranch: ref !== null,
  };
}

async function readAccount(key: string): Promise<string | null> {
  const me = await cursorJson<Record<string, unknown>>(key, '/v1/me');
  return firstString(me, ['userEmail', 'email', 'name', 'apiKeyName']);
}

async function listModels(key: string): Promise<CursorModel[]> {
  const listed = await cursorJson<{ items?: unknown[]; models?: unknown[] }>(key, '/v1/models');
  return (listed.items ?? listed.models ?? []).flatMap(describeModel);
}

function describeModel(entry: unknown): CursorModel[] {
  if (typeof entry === 'string') return [{ id: entry, displayName: entry }];
  const { id, displayName } = (entry ?? {}) as { id?: unknown; displayName?: unknown };
  if (typeof id !== 'string') return [];
  return [{ id, displayName: typeof displayName === 'string' ? displayName : id }];
}

function firstString(body: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) if (typeof body[key] === 'string') return body[key];
  return null;
}

async function failureOf(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message = body === null ? null : firstString(body as Record<string, unknown>, ['error', 'message', 'detail']);
  return message ?? `Cursor request failed (${response.status})`;
}
