import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { describePullRequest } from '@/features/pull-requests/pullRequests';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

const NUMBER_PATTERN = /^[0-9]{1,9}$/;

export async function GET(request: Request) {
  return apiRoute(request, () =>
    describePullRequest(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', NUMBER_PATTERN)),
    ),
  );
}
