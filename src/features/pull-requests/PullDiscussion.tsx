'use client';

import { useSheetRows } from './centralLayout';
import { pullCommentsPath } from './pullPaths';
import { renderMarkdown } from '@/features/markdown/renderMarkdown';
import type { PullComment } from './pullRequests';
import { timeAgo } from '@/features/surface-ui/timeAgo';

const NOTE = 'px-5 py-2 text-meta';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { HoverCardHtml } from '@/features/surface-ui/HoverCard';
import { useCachedJson } from '@/features/sources/useCachedJson';
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
  const commentState = useCachedJson<PullComment[]>(pullCommentsPath(owner, repo, number), token, ready);
  const { data: comments, error } = commentState;

  usePollWhileVisible(commentState.reload, ready);

  return (
    <div className="flex flex-col">
      <DiscussionEntry
        owner={owner}
        repo={repo}
        author={author}
        note="description"
        opening
        body={body?.trim() ? body : 'No description.'}
      />
      {comments === null ? (
        <p className={`${NOTE} ${error ? 'text-error-ink' : 'text-ink-dim'}`}>{error ?? 'Loading comments…'}</p>
      ) : comments.length === 0 ? (
        <p className={`${NOTE} text-ink-dim`}>No comments.</p>
      ) : (
        comments.map((comment) => (
          <DiscussionEntry
            key={comment.id}
            owner={owner}
            repo={repo}
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
  owner,
  repo,
  author,
  note,
  path,
  opening = false,
  body,
}: {
  owner: string;
  repo: string;
  author: string;
  note: string;
  path?: string | null;
  opening?: boolean;
  body: string;
}) {
  const wide = useSheetRows();
  return (
    <article className={entryClass(wide, opening)}>
      <header className={`flex items-baseline gap-2 ${wide ? 'mb-2 text-meta' : 'text-[9px]'} text-ink-dim`}>
        <span className="shrink-0 font-serif text-row text-ink">{author}</span>
        {path && <span className="min-w-0 flex-1 truncate">{path}</span>}
        <span className={`shrink-0 ${path ? '' : 'ml-auto'}`}>{note}</span>
      </header>
      <HoverCardHtml
        className={`markdown-body break-words text-ink ${wide ? 'text-doc' : 'text-[11px] leading-4'}`}
        html={renderMarkdown(body, { owner, repo })}
        tooltipStyle
      />
    </article>
  );
}

function entryClass(wide: boolean, opening: boolean): string {
  if (!wide) return 'border-b border-panel-edge px-1.5 py-1';
  return `border-b border-ink/10 py-4 pr-5 ${opening ? 'border-l-2 border-l-accent pl-[18px]' : 'pl-5'}`;
}
