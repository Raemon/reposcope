'use client';

import { useRouter } from 'next/navigation';
import { useCurrentPull } from './currentPullStore';
import { canMerge, mergePull } from './mergePull';
import { latestPullFailure, pullActionFor, usePullActions } from './pullActionStore';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken } from '@/features/sources/sourceStore';
import { FailureNote } from '@/features/surface-ui/FailureNote';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function MergePullButton({ repo, number }: { repo: RepoRef; number: number }) {
  const token = useGithubToken();
  const router = useRouter();
  const pull = useCurrentPull(repo.owner, repo.name, number);
  const actions = usePullActions();
  const action = pullActionFor(actions, repo.owner, repo.name, number);
  const failure = latestPullFailure(actions);
  const elsewhere = actions.find((acted) => acted.state === 'running' && acted !== action) ?? null;

  const merging = action?.kind === 'merge' && action.state === 'running';
  const closed = pull !== null && pull.pull.state !== 'open';
  const conflicted = pull?.conflicted ?? false;
  const done = (action?.kind === 'merge' && action.state === 'done') || (pull?.pull.merged ?? false);
  const mergeLabel = closed
    ? `Pull request is ${pull?.pull.state}`
    : conflicted
      ? `#${number} has conflicts with its base branch`
      : pull?.pull.draft
        ? `Mark #${number} ready for review and merge`
        : `Merge #${number}`;

  if (done) {
    return <span className="shrink-0 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">merged</span>;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {failure !== null && (
        <FailureNote label={`${failure.owner}/${failure.repo}#${failure.number}: ${failure.message}`}>
          #{failure.number} {failure.message}
        </FailureNote>
      )}
      {elsewhere !== null && (
        <span className="shrink-0 text-[10px] text-ink-dim">
          {elsewhere.kind === 'close' ? 'closing' : 'merging'} #{elsewhere.number}…
        </span>
      )}
      <HoverCardTrigger label={mergeLabel} focusable={false} tooltipStyle>
        <button
          type="button"
          onClick={() => mergePull({ owner: repo.owner, repo: repo.name, number }, token, (href) => router.push(href))}
          disabled={merging || !canMerge(pull)}
          className="shrink-0 rounded bg-btn px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-btn disabled:hover:text-ink-dim"
        >
          {merging ? 'Merging…' : conflicted ? 'Merge Conflicts' : 'Merge'}
        </button>
      </HoverCardTrigger>
    </div>
  );
}
