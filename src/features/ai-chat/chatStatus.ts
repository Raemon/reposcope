import type { ChatSession } from './aiChatStore';
import { runFinished } from './cursorTypes';

const RUN_LABELS: Record<string, string> = {
  CREATING: 'starting',
  PENDING: 'queued',
  RUNNING: 'working',
  ACTIVE: 'working',
  FINISHED: 'ready',
  ERROR: 'failed',
  FAILED: 'failed',
  CANCELLED: 'stopped',
  CANCELED: 'stopped',
  EXPIRED: 'expired',
};

export function statusLabel(session: ChatSession): string {
  if (session.launching) return 'cloning repo';
  if (session.queued !== null) return 'queued';
  const status = session.status;
  if (typeof status !== 'string') return session.error === null ? 'idle' : 'failed';
  return RUN_LABELS[status.toUpperCase()] ?? status.toLowerCase();
}

export function statusBusy(session: ChatSession): boolean {
  return session.launching || session.queued !== null || !runFinished(session.status);
}
