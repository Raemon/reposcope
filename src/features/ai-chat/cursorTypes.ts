export const CURSOR_KEY_HEADER = 'x-cursor-key';

export const WARMUP_PROMPT =
  'Clone the repository and get ready to work. Do not change any files yet. Reply with one short sentence naming the stack you found.';

export interface CursorModel {
  id: string;
  displayName: string;
}

export interface CursorSessionInfo {
  account: string | null;
  models: CursorModel[];
}

export interface CursorBranch {
  repoUrl: string;
  branch: string;
  prUrl?: string | null;
}

export interface CursorRun {
  id: string;
  agentId: string;
  status: string | null;
  result?: string | null;
  git?: { branches?: CursorBranch[] } | null;
}

export interface CursorAgent {
  id: string;
  name?: string | null;
  status: string;
  url?: string | null;
  latestRunId?: string | null;
}

export interface CursorLaunch {
  agent: CursorAgent;
  run: CursorRun;
}

export interface LaunchRequest {
  owner: string;
  repo: string;
  ref: string | null;
  prompt: string;
  model: string | null;
  name: string;
}

export interface FollowupRequest {
  agentId: string;
  prompt: string;
}

const TERMINAL = ['FINISHED', 'ERROR', 'FAILED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'ARCHIVED'];

// Total in `status` because a run status reaching here unrecognised must not throw mid-render.
export function runFinished(status: string | null | undefined): boolean {
  return typeof status !== 'string' || TERMINAL.includes(status.toUpperCase());
}

