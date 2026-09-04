import { changedFileSides, patchRowsOf } from './definitionContext';
import type { PeekOrigin } from './definitionFrames';
import { identifiersIn } from './identifierAt';
import type { ChangedFileSet } from './pullRequests';
import type { DiffCell } from './splitDiff';

const PRELOAD_DELAY_MS = 1200;
const PRELOAD_WORKERS = 3;
const MAX_PRELOADED = 20000;
const MIN_IDLE_MS = 2;
const FALLBACK_SLICE_MS = 8;

export function patchOrigins(fileSet: ChangedFileSet): PeekOrigin[] {
  const origins: PeekOrigin[] = [];
  for (const { file, rows } of patchRowsOf(fileSet)) {
    const sides = changedFileSides(file, fileSet.baseRef, fileSet.headRef);
    for (const row of rows) {
      if (row.left) origins.push(...cellOrigins(row.left, sides.leftPath, fileSet.baseRef));
      if (row.right) origins.push(...cellOrigins(row.right, sides.rightPath, fileSet.headRef));
    }
    if (origins.length >= MAX_PRELOADED) break;
  }
  return origins.slice(0, MAX_PRELOADED);
}

function cellOrigins(cell: DiffCell, path: string, ref: string): PeekOrigin[] {
  return identifiersIn(cell.text).map(({ word, column }) => ({ path, ref, line: cell.line, column, word }));
}

export function preloadDefinitions(
  origins: PeekOrigin[],
  warm: (origin: PeekOrigin) => Promise<void>,
  afterBatch: () => void,
): () => void {
  const queue = [...origins];
  let cancelled = false;
  const warmNext = () => warm(queue.shift() as PeekOrigin).catch(() => null);
  const drainWhileIdle = async (deadline: IdleDeadline) => {
    while (!cancelled && queue.length > 0 && deadline.timeRemaining() > MIN_IDLE_MS) await warmNext();
  };
  const worker = async () => {
    while (!cancelled && queue.length > 0) {
      await drainWhileIdle(await idle());
      if (!cancelled) afterBatch();
    }
  };
  const start = setTimeout(() => startWorkers(worker), PRELOAD_DELAY_MS);
  return () => {
    cancelled = true;
    clearTimeout(start);
  };
}

function startWorkers(worker: () => Promise<void>) {
  for (let at = 0; at < PRELOAD_WORKERS; at += 1) void worker();
}

function idle(): Promise<IdleDeadline> {
  if (typeof requestIdleCallback === 'function') return new Promise((resolve) => requestIdleCallback(resolve, { timeout: 1000 }));
  return new Promise((resolve) => setTimeout(() => resolve(timedSlice()), 16));
}

function timedSlice(): IdleDeadline {
  const until = performance.now() + FALLBACK_SLICE_MS;
  return { didTimeout: false, timeRemaining: () => Math.max(0, until - performance.now()) };
}
