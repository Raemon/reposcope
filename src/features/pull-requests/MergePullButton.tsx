'use client';

import { useState } from 'react';
import { useCurrentPull } from './currentPullStore';
import type { MergeResult } from './pullRequests';
import { apiPost } from '@/features/sources/apiClient';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken } from '@/features/sources/sourceStore';

export function MergePullButton({ repo, number }: { repo: RepoRef; number: number }) {
  const token = useGithubToken();
  const held = useCurrentPull();
  const pull = held && held.pull.number === number ? held : null;
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closed = pull !== null && pull.pull.state !== 'open';
  const conflicted = pull?.conflicted ?? false;
  const done = merged || (pull?.pull.merged ?? false);

  async function merge() {
    setMerging(true);
    setError(null);
    try {
      const result = await apiPost<MergeResult>(
        `/api/github/merge?owner=${encodeURIComponent(repo.owner)}&name=${encodeURIComponent(repo.name)}&number=${number}`,
        token,
      );
      if (result.merged) setMerged(true);
      else setError(result.message || 'Merge refused');
    } catch (issue: unknown) {
      setError(issue instanceof Error ? issue.message : String(issue));
    } finally {
      setMerging(false);
    }
  }

  if (done) {
    return <span className="shrink-0 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">merged</span>;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {error !== null && (
        <span title={error} className="max-w-56 truncate text-[10px] text-error-ink">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={merge}
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
        className="shrink-0 rounded bg-btn px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-btn disabled:hover:text-ink-dim"
      >
        {merging ? 'Merging…' : conflicted ? 'Merge Conflicts' : 'Merge'}
      </button>
    </div>
  );
}
