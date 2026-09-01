import { GithubRequestError } from '@/features/codebases/githubRequest';
import { counting, matching, text, PATH_PATTERN, SHA_PATTERN } from './fieldChecks';
import type { ReviewThreadDraft } from './reviewThreads';

const MAX_BODY_CHARS = 65_536;

export function reviewThreadDraft(body: unknown): ReviewThreadDraft {
  const asked = body as Partial<ReviewThreadDraft> | null;
  return {
    body: commentBody(asked?.body),
    commitId: matching(asked?.commitId, 'commitId', SHA_PATTERN),
    path: matching(asked?.path, 'path', PATH_PATTERN),
    line: counting(asked?.line, 'line'),
    side: commentSide(asked?.side),
  };
}

function commentBody(value: unknown): string {
  const given = text(value, 'body');
  if (given.length > MAX_BODY_CHARS) throw new GithubRequestError(413, 'Comment body is too long');
  return given;
}

function commentSide(value: unknown): 'left' | 'right' {
  if (value !== 'left' && value !== 'right') throw new GithubRequestError(400, 'Missing or invalid side');
  return value;
}
