'use client';

import { useEffect, useState } from 'react';
import type { PullComment } from './pullRequests';
import { timeAgo } from '@/features/repo-insights/ui/timeAgo';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';

export function PullDiscussion({
  owner,
  repo,
  number,
  author,
  body,
}: {
  owner: string;
  repo: string;
  number: number;
  author: string;
  body: string | null;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const [comments, setComments] = useState<PullComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setComments(null);
    setError(null);
    apiJson<PullComment[]>(
      `/api/github/pull-comments?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&number=${number}`,
      token,
      controller.signal,
    )
      .then(setComments)
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [owner, repo, number, token, ready]);

  return (
    <div className="flex flex-col">
      <DiscussionEntry author={author} note="description" body={body?.trim() ? body : 'No description.'} />
      {error !== null ? (
        <p className="px-1.5 py-1 text-[11px] leading-4 text-error-ink">{error}</p>
      ) : comments === null ? (
        <p className="px-1.5 py-1 text-[11px] leading-4 text-ink-dim">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="px-1.5 py-1 text-[11px] leading-4 text-ink-dim">No comments.</p>
      ) : (
        comments.map((comment) => (
          <DiscussionEntry
            key={comment.id}
            author={comment.author}
            note={timeAgo(comment.createdAt)}
            path={comment.path}
            body={comment.body}
          />
        ))
      )}
    </div>
  );
}

function DiscussionEntry({
  author,
  note,
  path,
  body,
}: {
  author: string;
  note: string;
  path?: string | null;
  body: string;
}) {
  return (
    <article className="border-b border-panel-edge px-1.5 py-1">
      <header className="flex items-baseline gap-1.5 text-[9px] text-ink-dim">
        <span className="shrink-0 text-ink">{author}</span>
        <span className="shrink-0">{note}</span>
        {path && <span className="min-w-0 flex-1 truncate">{path}</span>}
      </header>
      <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-ink">{body}</p>
    </article>
  );
}
