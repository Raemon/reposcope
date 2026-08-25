import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { replyToReviewThread } from '@/features/pull-requests/reviewThreads';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

const NUMBER_PATTERN = /^[0-9]{1,9}$/;

export async function POST(request: Request) {
  return apiRoute(request, async () =>
    replyToReviewThread(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', NUMBER_PATTERN)),
      Number(requireParam(request, 'comment', NUMBER_PATTERN)),
      await commentBody(request),
    ),
  );
}

async function commentBody(request: Request): Promise<string> {
  const { body } = (await request.json().catch(() => ({}))) as { body?: unknown };
  return typeof body === 'string' ? body : '';
}
