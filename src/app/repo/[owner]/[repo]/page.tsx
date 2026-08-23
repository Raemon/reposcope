import { Suspense } from 'react';
import { RepoSurface, SurfaceLoading } from '@/features/codebases/RepoSurface';

export default async function RepoApiPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  return (
    <Suspense fallback={<SurfaceLoading heading={`${owner}/${repo}`} />}>
      <RepoSurface owner={owner} repo={repo} />
    </Suspense>
  );
}
