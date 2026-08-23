import { Suspense } from 'react';
import { RepoSurface } from '@/features/codebases/RepoSurface';

export default async function RepoApiPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  return (
    <Suspense fallback={<p className="text-xs text-ink-dim">Fetching and parsing the repository…</p>}>
      <RepoSurface owner={owner} repo={repo} />
    </Suspense>
  );
}
