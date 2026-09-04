'use client';

import { useRouter } from 'next/navigation';
import { useCurrentPull } from './currentPullStore';
import { FixConflictsMenu } from './FixConflictsMenu';
import { mergePull } from './mergePull';
import { dismissPullAction, latestPullFailure, pullActionFor, sameTarget, usePullActions, type PullAction, type PullTarget } from './pullActionStore';
import type { PullRequestCommits } from './pullRequests';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken } from '@/features/sources/sourceStore';
import { CHOICE } from '@/features/surface-ui/buttonStyles';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

interface ButtonState {
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}

interface MergeState {
  target: PullTarget;
  mergedHere: boolean;
  pull: PullRequestCommits | null;
  running: PullAction | null;
  failure: PullAction | null;
  merge: () => void;
}

export function MergePullButton({ repo, number }: { repo: RepoRef; number: number }) {
  const state = useMergeState(repo, number);
  const { pull, running, failure } = state;
  if (pull?.pull.merged || state.mergedHere) return <MergedBadge />;
  if (running === null && failure === null && pull?.conflicted && pull.pull.state === 'open') {
    return <FixConflictsMenu repo={repo} number={number} pull={pull} />;
  }
  const button = buttonState(state);
  return (
    <HoverCardTrigger label={button.title} focusable={false} tooltipStyle>
      <button type="button" onClick={button.onClick} disabled={button.disabled} className={`${CHOICE} shrink-0`}>
        {button.label}
      </button>
    </HoverCardTrigger>
  );
}

function useMergeState(repo: RepoRef, number: number): MergeState {
  const token = useGithubToken();
  const router = useRouter();
  const target = { owner: repo.owner, repo: repo.name, number };
  const actions = usePullActions();
  const action = pullActionFor(actions, target.owner, target.repo, number);
  return {
    target,
    mergedHere: action?.kind === 'merge' && action.state === 'done',
    pull: useCurrentPull(target.owner, target.repo, number),
    running: actions.find((acted) => acted.state === 'running') ?? null,
    failure: action?.state === 'failed' ? action : latestPullFailure(actions),
    merge: () => mergePull(target, token, (href) => router.push(href)),
  };
}

function MergedBadge() {
  return <span className="shrink-0 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">merged</span>;
}

function buttonState(state: MergeState): ButtonState {
  const { target, pull, running, failure, merge } = state;
  if (running !== null) return busyState(running, target);
  if (failure !== null) return failedState(failure, target, merge);
  if (pull === null) return disabledState(`Loading #${target.number}…`);
  if (pull.pull.state !== 'open') return disabledState(`Pull request is ${pull.pull.state}`);
  const title = pull.pull.draft ? `Mark #${target.number} ready for review and merge` : `Merge #${target.number}`;
  return { label: 'Merge', title, disabled: false, onClick: merge };
}

function disabledState(title: string): ButtonState {
  return { label: 'Merge', title, disabled: true, onClick: () => {} };
}

function busyState(running: PullAction, target: PullTarget): ButtonState {
  const verb = running.kind === 'close' ? 'Closing' : 'Merging';
  const label = sameTarget(running, target) ? `${verb}…` : `${verb} #${running.number}…`;
  return { label, title: `${verb} ${running.owner}/${running.repo}#${running.number}`, disabled: true, onClick: () => {} };
}

// Another PR's failure occupies the button, so a stray click here dismisses, never merges.
function failedState(failure: PullAction, target: PullTarget, merge: () => void): ButtonState {
  const title = `${failure.owner}/${failure.repo}#${failure.number}: ${failure.message}`;
  const own = sameTarget(failure, target);
  if (own && failure.kind === 'merge') return { label: 'Merge failed · retry', title, disabled: false, onClick: merge };
  const label = own ? 'Close failed · dismiss' : `#${failure.number} failed · dismiss`;
  return { label, title, disabled: false, onClick: () => dismissPullAction(failure) };
}
