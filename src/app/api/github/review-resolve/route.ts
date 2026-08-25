import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { setThreadResolved } from '@/features/pull-requests/reviewThreads';
import { FLAG_PATTERN, NODE_ID_PATTERN } from '@/features/pull-requests/reviewParams';

export async function POST(request: Request) {
  return apiRoute(request, () =>
    setThreadResolved(
      requireParam(request, 'thread', NODE_ID_PATTERN),
      requireParam(request, 'resolved', FLAG_PATTERN) === 'true',
    ),
  );
}
