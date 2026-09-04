import { GithubRequestError } from '@/features/codebases/githubRequest';
import { counting, matching, text } from './fieldChecks';
import type { NewReviewComment } from './reviewThreads';
import { PATH_PATTERN } from './routeParams';
import { COMMIT_SHA_PATTERN } from '@/features/sources/sourceTypes';

const MAX_BODY_CHARS = 65_536;

export function newReviewComment(body: unknown): NewReviewComment {
  const asked = body as Partial<NewReviewComment> | null;
  return {
    body: commentBody(asked?.body),
    commitId: matching(asked?.commitId, 'commitId', COMMIT_SHA_PATTERN),
    path: matching(asked?.path, 'path', PATH_PATTERN),
    line: counting(asked?.line, 'line'),
    side: commentSide(asked?.side),
  };
}

export function commentBody(value: unknown): string {
  const given = text(value, 'body');
  if (given.length > MAX_BODY_CHARS) throw new GithubRequestError(413, 'Comment body is too long');
  return given;
}

function commentSide(value: unknown): 'left' | 'right' {
  if (value !== 'left' && value !== 'right') throw new GithubRequestError(400, 'Missing or invalid side');
  return value;
}
