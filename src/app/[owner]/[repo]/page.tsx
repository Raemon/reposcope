import { ColumnNavProvider } from '@/features/pull-requests/columnNav';
import { RepoPullsSurface } from '@/features/pull-requests/PullsSurface';

export default async function RepoPullsPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  return (
    <ColumnNavProvider>
      <RepoPullsSurface owner={owner} repo={repo} />
    </ColumnNavProvider>
  );
}
