import type { CodeIntelQuery, FromWorker, Source, ToWorker } from './codeIntelTypes';
import { createProjects } from './tsProject';

interface Waiting {
  resolve: (value: unknown) => void;
  reject: (issue: Error) => void;
}

const waiting = new Map<number, Waiting>();
let nextId = 0;

function post(message: FromWorker) {
  self.postMessage(message);
}

function ask<T>(message: FromWorker): Promise<T> {
  return new Promise((resolve, reject) => {
    waiting.set(message.id, { resolve: resolve as (value: unknown) => void, reject });
    post(message);
  });
}

const source: Source = {
  listing: (ref) => ask({ kind: 'listing', id: nextId++, ref }),
  read: (ref, paths) => ask({ kind: 'need', id: nextId++, ref, paths }),
};

const projects = createProjects(source);

async function answer(id: number, query: CodeIntelQuery) {
  try {
    post({ kind: 'result', id, result: await projects.query(query) });
  } catch (issue: unknown) {
    post({ kind: 'error', id, message: issue instanceof Error ? issue.message : String(issue) });
  }
}

function settle(message: Extract<ToWorker, { kind: 'files' | 'listing' }>) {
  const held = waiting.get(message.id);
  waiting.delete(message.id);
  if (!held) return;
  if (message.kind === 'listing' && message.error !== undefined) held.reject(new Error(message.error));
  else held.resolve(message.kind === 'files' ? message.texts : message.listing);
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  if (message.kind === 'query') void answer(message.id, message.query);
  else settle(message);
};
