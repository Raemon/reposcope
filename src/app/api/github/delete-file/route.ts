import { apiRoute, requireParam } from '@/features/github-auth/apiRoute';
import { COMMIT_NUMBER_PATTERN, fileDeletion } from '@/features/pull-requests/commitRequests';
import { commitFileDeletion } from '@/features/pull-requests/pullRequests';
import { LOGIN_PATTERN, REPO_NAME_PATTERN } from '@/features/sources/sourceTypes';

export async function POST(request: Request) {
  return apiRoute(request, async () =>
    commitFileDeletion(
      requireParam(request, 'owner', LOGIN_PATTERN),
      requireParam(request, 'name', REPO_NAME_PATTERN),
      Number(requireParam(request, 'number', COMMIT_NUMBER_PATTERN)),
      fileDeletion(await request.json()),
    ),
  );
}
