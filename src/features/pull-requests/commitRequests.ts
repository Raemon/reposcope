import { GithubRequestError } from '@/features/codebases/githubRequest';
import type { FileDeletion, FileEdit } from './pullRequests';

export const COMMIT_NUMBER_PATTERN = /^[1-9][0-9]{0,8}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\0]{1,1024}$/;
const MAX_EDIT_BYTES = 200_000;
const MAX_MESSAGE_CHARS = 2_000;

export function fileEdit(body: unknown): FileEdit {
  const edit = body as Partial<FileEdit> | null;
  const startLine = counting(edit?.startLine, 'startLine');
  const endLine = counting(edit?.endLine, 'endLine');
  if (endLine < startLine) throw new GithubRequestError(400, 'endLine precedes startLine');
  return {
    ...fileDeletion(body),
    startLine,
    endLine,
    original: bounded(edit?.original, 'original'),
    updated: bounded(edit?.updated, 'updated'),
  };
}

export function fileDeletion(body: unknown): FileDeletion {
  const asked = body as Partial<FileDeletion> | null;
  const path = text(asked?.path, 'path');
  if (!PATH_PATTERN.test(path)) throw new GithubRequestError(400, 'Invalid path');
  const message = text(asked?.message, 'message');
  if (message.length > MAX_MESSAGE_CHARS) throw new GithubRequestError(413, 'Commit message is too long');
  const headRef = text(asked?.headRef, 'headRef');
  if (!SHA_PATTERN.test(headRef)) throw new GithubRequestError(400, 'Invalid headRef');
  return { path, headRef, message };
}

function bounded(value: unknown, name: string): string {
  const given = text(value, name, true);
  if (Buffer.byteLength(given, 'utf8') > MAX_EDIT_BYTES) throw new GithubRequestError(413, `${name} is too large`);
  return given;
}

function text(value: unknown, name: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value === '')) {
    throw new GithubRequestError(400, `Missing or invalid ${name}`);
  }
  return value;
}

function counting(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new GithubRequestError(400, `Missing or invalid ${name}`);
  }
  return value;
}
