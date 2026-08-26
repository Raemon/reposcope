'use client';

import { pullCommentsPath } from './pullPaths';
import { renderMarkdown } from '@/features/markdown/renderMarkdown';
import type { PullComment } from './pullRequests';
import { timeAgo } from '@/features/surface-ui/timeAgo';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { HoverCardHtml } from '@/features/surface-ui/HoverCard';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { useIsOwnAuthor } from '@/features/github-auth/useViewerLogin';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';

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
  const isOwnAuthor = useIsOwnAuthor();
  const commentState = useCachedJson<PullComment[]>(pullCommentsPath(owner, repo, number), token, ready);
  const { data: comments, error } = commentState;

  usePollWhileVisible(commentState.reload, ready);

  return (
    <div className="flex flex-col">
      <DiscussionEntry
        owner={owner}
        repo={repo}
        author={isOwnAuthor(author) ? null : author}
        note="description"
        body={body?.trim() ? body : 'No description.'}
      />
      {comments === null ? (
        <p className={`px-1.5 py-1 text-[11px] leading-4 ${error ? 'text-error-ink' : 'text-ink-dim'}`}>
          {error ?? 'Loading comments…'}
        </p>
      ) : comments.length === 0 ? (
        <p className="px-1.5 py-1 text-[11px] leading-4 text-ink-dim">No comments.</p>
      ) : (
        comments.map((comment) => (
          <DiscussionEntry
            key={comment.id}
            owner={owner}
            repo={repo}
            author={isOwnAuthor(comment.author) ? null : comment.author}
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
  owner,
  repo,
  author,
  note,
  path,
  body,
}: {
  owner: string;
  repo: string;
  author: string | null;
  note: string;
  path?: string | null;
  body: string;
}) {
  return (
    <article className="border-b border-panel-edge px-1.5 py-1">
      <header className="flex items-baseline gap-1.5 text-[9px] text-ink-dim">
        {author && <span className="shrink-0 text-ink">{author}</span>}
        <span className="shrink-0">{note}</span>
        {path && <span className="min-w-0 flex-1 truncate">{path}</span>}
      </header>
      <HoverCardHtml
        className="markdown-body break-words text-[11px] leading-4 text-ink"
        html={renderMarkdown(body, { owner, repo })}
        tooltipStyle
      />
    </article>
  );
}
