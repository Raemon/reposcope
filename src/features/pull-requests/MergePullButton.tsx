'use client';

import { useRouter } from 'next/navigation';
import { useCurrentPull } from './currentPullStore';
import { mergePull } from './mergePull';
import { latestMergeFailure, mergeAttemptFor, useMergeAttempts } from './mergeStore';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken } from '@/features/sources/sourceStore';

export function MergePullButton({ repo, number }: { repo: RepoRef; number: number }) {
  const token = useGithubToken();
  const router = useRouter();
  const held = useCurrentPull();
  const attempts = useMergeAttempts();
  const pull = held && held.pull.number === number ? held : null;
  const attempt = mergeAttemptFor(attempts, repo.owner, repo.name, number);
  const failure = latestMergeFailure(attempts);
  const elsewhere = attempts.find((tried) => tried.state === 'merging' && tried !== attempt) ?? null;

  const merging = attempt?.state === 'merging';
  const closed = pull !== null && pull.pull.state !== 'open';
  const conflicted = pull?.conflicted ?? false;
  const done = attempt?.state === 'merged' || (pull?.pull.merged ?? false);

  if (done) {
    return <span className="shrink-0 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">merged</span>;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {failure !== null && (
        <span
          title={`${failure.owner}/${failure.repo}#${failure.number}: ${failure.message}`}
          className="max-w-56 truncate text-[10px] text-error-ink"
        >
          #{failure.number} {failure.message}
        </span>
      )}
      {elsewhere !== null && (
        <span className="shrink-0 text-[10px] text-ink-dim">merging #{elsewhere.number}…</span>
      )}
      <button
        type="button"
        onClick={() => mergePull({ owner: repo.owner, repo: repo.name, number }, token, (href) => router.push(href))}
        disabled={merging || pull === null || closed || conflicted}
        title={
          closed
            ? `Pull request is ${pull?.pull.state}`
            : conflicted
              ? `#${number} has conflicts with its base branch`
              : pull?.pull.draft
                ? `Mark #${number} ready for review and merge`
                : `Merge #${number}`
        }
        className="shrink-0 rounded border border-btn-edge px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-dim"
      >
        {merging ? 'Merging…' : conflicted ? 'Merge Conflicts' : 'Merge'}
      </button>
    </div>
  );
}
