import { apiRoute } from '@/features/github-auth/apiRoute';
import { describeViewer } from '@/features/github-auth/viewerIdentity';

export async function GET(request: Request) {
  return apiRoute(request, describeViewer);
}
