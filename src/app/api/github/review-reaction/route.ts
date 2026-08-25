import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { setCommentReaction } from '@/features/pull-requests/reviewThreads';
import { FLAG_PATTERN, NODE_ID_PATTERN } from '@/features/pull-requests/reviewParams';

export async function POST(request: Request) {
  return apiRoute(request, () =>
    setCommentReaction(
      requireParam(request, 'comment', NODE_ID_PATTERN),
      requireParam(request, 'reacted', FLAG_PATTERN) === 'true',
    ),
  );
}
