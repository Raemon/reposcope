import { GithubRequestError } from '@/features/codebases/githubRequest';
import { counting, matching, text } from './fieldChecks';
import { PATH_PATTERN } from './routeParams';
import type { FileDeletion, FileEdit } from './pullRequests';
import { COMMIT_SHA_PATTERN } from '@/features/sources/sourceTypes';

export const COMMIT_NUMBER_PATTERN = /^[1-9][0-9]{0,8}$/;
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
  const message = text(asked?.message, 'message');
  if (message.length > MAX_MESSAGE_CHARS) throw new GithubRequestError(413, 'Commit message is too long');
  return {
    path: matching(asked?.path, 'path', PATH_PATTERN),
    headRef: matching(asked?.headRef, 'headRef', COMMIT_SHA_PATTERN),
    message,
  };
}

function bounded(value: unknown, name: string): string {
  const given = text(value, name, true);
  if (Buffer.byteLength(given, 'utf8') > MAX_EDIT_BYTES) throw new GithubRequestError(413, `${name} is too large`);
  return given;
}
