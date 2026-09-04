import { ColumnNavProvider } from '@/features/pull-requests/columnNav';
import { RepoPullsSurface } from '@/features/pull-requests/PullsSurface';

export default async function RepoPullsPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  const { owner, repo } = await params;
  const { file } = await searchParams;
  return (
    <ColumnNavProvider>
      <RepoPullsSurface owner={owner} repo={repo} wantedFile={file ?? null} />
    </ColumnNavProvider>
  );
}
