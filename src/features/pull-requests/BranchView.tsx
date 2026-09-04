'use client';

import { useEffect } from 'react';
import { RepoPullsColumn } from './PullListColumn';
import { ReviewLoadNotice } from './ReviewLoadNotice';
import { ReviewWorkspace } from './ReviewWorkspace';
import { setCurrentBranch } from './currentPullStore';
import { headCommit } from './headCommit';
import type { ChangeSummary } from './pullRequests';
import { branchFilesPath, branchPath, branchSubject } from './pullPaths';
import { useStickyColumn } from './stickyColumns';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';

export function BranchView({ owner, repo, branch }: { owner: string; repo: string; branch: string }) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const [listSize, setListSize] = useStickyColumn('pulls');
  const branchState = useCachedJson<ChangeSummary>(branchPath(owner, repo, branch), token, ready);
  const change = branchState.data;

  usePollWhileVisible(branchState.reload, ready);

  useEffect(() => () => setCurrentBranch(null), []);
  useEffect(() => {
    setCurrentBranch(change && { owner, repo, branch, head: headCommit(change) });
  }, [change, owner, repo, branch]);

  if (!change) return <ReviewLoadNotice label={branch} error={branchState.error} reload={branchState.reload} />;

  return (
    <ReviewWorkspace
      owner={owner}
      repo={repo}
      number={null}
      subjectKey={branchSubject(owner, repo, branch)}
      change={change}
      baseRef={null}
      headRef={branch}
      reloadChange={branchState.reload}
      wholeFilesPath={branchFilesPath(owner, repo, branch)}
      listColumn={<RepoPullsColumn owner={owner} repo={repo} size={listSize} onSize={setListSize} />}
      discussion={null}
      editableWhole={null}
    />
  );
}
