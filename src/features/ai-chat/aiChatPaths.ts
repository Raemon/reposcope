export const CURSOR_SESSION_PATH = '/api/cursor/session';
export const CURSOR_AGENT_PATH = '/api/cursor/agent';
export const CURSOR_RUN_PATH = '/api/cursor/run';

export function cursorRunPath(agentId: string, runId: string): string {
  return `${CURSOR_RUN_PATH}?${runParams(agentId, runId)}`;
}

export function cursorRunStreamPath(agentId: string, runId: string): string {
  return `${CURSOR_RUN_PATH}/stream?${runParams(agentId, runId)}`;
}

function runParams(agentId: string, runId: string): string {
  return `agent=${encodeURIComponent(agentId)}&run=${encodeURIComponent(runId)}`;
}
