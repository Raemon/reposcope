import { GithubRequestError } from '@/features/codebases/githubRequest';
import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { commitFileEdit, type FileEdit } from '@/features/pull-requests/pullRequests';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

const NUMBER_PATTERN = /^[0-9]{1,9}$/;
const PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\0]{1,1024}$/;
const MAX_EDIT_BYTES = 200_000;
const MAX_MESSAGE_CHARS = 2_000;

export async function POST(request: Request) {
  return apiRoute(request, async () =>
    commitFileEdit(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', NUMBER_PATTERN)),
      fileEdit(await request.json()),
    ),
  );
}

function fileEdit(body: unknown): FileEdit {
  const edit = body as Partial<FileEdit> | null;
  const path = text(edit?.path, 'path');
  if (!PATH_PATTERN.test(path)) throw new GithubRequestError(400, 'Invalid path');
  const startLine = counting(edit?.startLine, 'startLine');
  const endLine = counting(edit?.endLine, 'endLine');
  if (endLine < startLine) throw new GithubRequestError(400, 'endLine precedes startLine');
  const updated = text(edit?.updated, 'updated', true);
  if (Buffer.byteLength(updated, 'utf8') > MAX_EDIT_BYTES) throw new GithubRequestError(413, 'Edit is too large');
  const original = text(edit?.original, 'original', true);
  if (Buffer.byteLength(original, 'utf8') > MAX_EDIT_BYTES) throw new GithubRequestError(413, 'Edit is too large');
  const message = text(edit?.message, 'message');
  if (message.length > MAX_MESSAGE_CHARS) throw new GithubRequestError(413, 'Commit message is too long');
  return { path, startLine, endLine, original, updated, message };
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
