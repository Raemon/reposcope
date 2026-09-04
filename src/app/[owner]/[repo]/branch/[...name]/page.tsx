import { BranchView } from '@/features/pull-requests/BranchView';
import { CentralLayoutProvider } from '@/features/pull-requests/centralLayout';
import { ColumnNavProvider } from '@/features/pull-requests/columnNav';

export default async function BranchPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string; name: string[] }>;
  searchParams: Promise<{ file?: string; commit?: string }>;
}) {
  const { owner, repo, name } = await params;
  const { file, commit } = await searchParams;
  return (
    <ColumnNavProvider>
      <CentralLayoutProvider>
        <BranchView owner={owner} repo={repo} branch={name.join('/')} wantedFile={file ?? null} wantedCommit={commit ?? null} />
      </CentralLayoutProvider>
    </ColumnNavProvider>
  );
}
