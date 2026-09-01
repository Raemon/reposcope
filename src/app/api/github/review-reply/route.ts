import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { commentBody } from '@/features/pull-requests/reviewCommentRequests';
import { replyToReviewThread } from '@/features/pull-requests/reviewThreads';
import { PULL_NUMBER_PATTERN } from '@/features/pull-requests/routeParams';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function POST(request: Request) {
  return apiRoute(request, async () =>
    replyToReviewThread(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', PULL_NUMBER_PATTERN)),
      Number(requireParam(request, 'comment', PULL_NUMBER_PATTERN)),
      await replyBody(request),
    ),
  );
}

async function replyBody(request: Request): Promise<string> {
  const asked = (await request.json().catch(() => null)) as { body?: unknown } | null;
  return commentBody(asked?.body);
}
