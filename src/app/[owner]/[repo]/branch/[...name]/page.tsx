import { BranchView } from '@/features/pull-requests/BranchView';
import { CentralLayoutProvider } from '@/features/pull-requests/centralLayout';
import { ColumnNavProvider } from '@/features/pull-requests/columnNav';

export default async function BranchPage({ params }: { params: Promise<{ owner: string; repo: string; name: string[] }> }) {
  const { owner, repo, name } = await params;
  return (
    <ColumnNavProvider>
      <CentralLayoutProvider>
        <BranchView owner={owner} repo={repo} branch={name.join('/')} />
      </CentralLayoutProvider>
    </ColumnNavProvider>
  );
}
