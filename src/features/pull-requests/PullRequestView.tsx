'use client';

import { useEffect } from 'react';
import { PullDiscussion } from './PullDiscussion';
import { AllPullsColumn, RepoPullsColumn } from './PullListColumn';
import { ReviewWorkspace } from './ReviewWorkspace';
import { setCurrentPull } from './currentPullStore';
import { pullFilesPath, pullPath } from './pullPaths';
import type { PullRequestCommits, PullRequestSummary } from './pullRequests';
import { useStickyColumn } from './stickyColumns';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';

export function PullRequestView({
  owner,
  repo,
  number,
  acrossRepos = false,
}: {
  owner: string;
  repo: string;
  number: number;
  acrossRepos?: boolean;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const [listSize, setListSize] = useStickyColumn(acrossRepos ? 'all-pulls' : 'pulls');
  const pullState = useCachedJson<PullRequestCommits>(pullPath(owner, repo, number), token, ready);
  const pull = pullState.data;

  usePollWhileVisible(pullState.reload, ready);

  useEffect(() => () => setCurrentPull(null), []);
  useEffect(() => {
    setCurrentPull(pull && { owner, repo, pull });
  }, [pull, owner, repo]);

  if (!pull) {
    if (pullState.error) return <p className="px-2 py-1 text-[11px] text-error-ink">{pullState.error}</p>;
    return <p className="px-2 py-1 text-[11px] text-ink-dim">Loading #{number}…</p>;
  }

  return (
    <ReviewWorkspace
      owner={owner}
      repo={repo}
      number={number}
      subjectKey={`${owner}/${repo}#${number}`}
      change={pull}
      reloadChange={pullState.reload}
      wholeFilesPath={pullFilesPath(owner, repo, number)}
      listColumn={
        acrossRepos ? (
          <AllPullsColumn size={listSize} onSize={setListSize} />
        ) : (
          <RepoPullsColumn owner={owner} repo={repo} size={listSize} onSize={setListSize} />
        )
      }
      discussion={<PullDiscussion owner={owner} repo={repo} number={number} author={pull.pull.author} body={pull.body} />}
      editableWhole={editablePull(pull.pull)}
    />
  );
}

function editablePull(pull: PullRequestSummary): PullRequestSummary | null {
  return pull.state === 'open' && !pull.merged ? pull : null;
}
