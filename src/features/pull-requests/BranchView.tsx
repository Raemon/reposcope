'use client';

import { RepoPullsColumn } from './PullListColumn';
import { ReviewWorkspace } from './ReviewWorkspace';
import type { ChangeSummary } from './pullRequests';
import { branchFilesPath, branchPath } from './pullPaths';
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

  if (!change) {
    if (branchState.error) return <p className="px-2 py-1 text-[11px] text-error-ink">{branchState.error}</p>;
    return <p className="px-2 py-1 text-[11px] text-ink-dim">Loading {branch}…</p>;
  }

  return (
    <ReviewWorkspace
      owner={owner}
      repo={repo}
      number={null}
      subjectKey={`${owner}/${repo}@${branch}`}
      change={change}
      reloadChange={branchState.reload}
      wholeFilesPath={branchFilesPath(owner, repo, branch)}
      listColumn={<RepoPullsColumn owner={owner} repo={repo} size={listSize} onSize={setListSize} />}
      discussion={null}
      editableWhole={null}
    />
  );
}
