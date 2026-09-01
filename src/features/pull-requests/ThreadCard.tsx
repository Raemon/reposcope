'use client';

import { useContext, useState } from 'react';
import { isDraftThread } from './draftThread';
import { clearDraftThread } from './draftThreadStore';
import { EditTarget } from './editTarget';
import { reviewCommentPath, reviewReactionPath, reviewReplyPath, reviewResolvePath } from './pullPaths';
import type { ReviewComment, ReviewThread } from './reviewThreads';
import { useReviewTarget, type ReviewThreadTarget } from './reviewThreadStore';
import { ThreadReplyBox } from './ThreadReplyBox';
import { useThreadAction } from './useThreadAction';
import { renderMarkdown } from '@/features/markdown/renderMarkdown';
import { HoverCardHtml, HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { useGithubToken } from '@/features/sources/sourceStore';
import { apiPost, apiPostJson } from '@/features/sources/apiClient';

const ACTION = 'rounded px-1 leading-4 text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40';

export function ThreadCard({ thread }: { thread: ReviewThread }) {
  if (isDraftThread(thread)) return <DraftThreadCard thread={thread} />;
  return <PostedThreadCard thread={thread} />;
}

function DraftThreadCard({ thread }: { thread: ReviewThread }) {
  const target = useReviewTarget();
  const token = useGithubToken();
  const commitId = useContext(EditTarget)?.headRef ?? '';
  const action = useThreadAction(() => target.reload().then(clearDraftThread));
  return (
    <article className="overflow-hidden rounded border border-panel-edge bg-tip shadow-card">
      <header className="px-1.5 pt-[2px] text-[9px] leading-4 text-ink-dim">New comment · line {thread.line}</header>
      <ThreadReplyBox
        busy={action.busy}
        placeholder="Comment…"
        onCancel={clearDraftThread}
        onSend={(body) => action.run(() => sendNewThread(target, thread, commitId, body, token))}
      />
      {action.failure && <p className="px-1.5 pb-0.5 text-[9px] leading-3 text-error-ink">{action.failure}</p>}
    </article>
  );
}

function PostedThreadCard({ thread }: { thread: ReviewThread }) {
  const target = useReviewTarget();
  const token = useGithubToken();
  const action = useThreadAction(target.reload);
  const [replying, setReplying] = useState(false);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? !thread.resolved;
  const shown = open ? thread.comments : thread.comments.slice(0, 1);
  return (
    <article
      className={`group relative overflow-hidden rounded border border-panel-edge bg-tip shadow-card ${thread.resolved ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      {shown.map((comment, index) => (
        <ThreadComment
          key={comment.id}
          comment={comment}
          note={index === 0 ? threadNote(thread, open) : ''}
          showBody={open}
          repo={target}
          onToggle={() => setToggled(!open)}
        />
      ))}
      {replying && (
        <ThreadReplyBox
          busy={action.busy}
          onCancel={() => setReplying(false)}
          onSend={(body) => {
            setReplying(false);
            action.run(() => sendReply(target, thread, body, token));
          }}
        />
      )}
      {action.failure && <p className="px-1.5 pb-0.5 text-[9px] leading-3 text-error-ink">{action.failure}</p>}
      {!replying && (
        <ThreadActions
          thread={thread}
          busy={action.busy}
          onReply={() => setReplying(true)}
          onReact={() => action.run(() => sendReaction(thread.comments[0], token))}
          onResolve={thread.threadId === null ? null : () => action.run(() => sendResolve(thread, token))}
        />
      )}
    </article>
  );
}

function threadNote(thread: ReviewThread, open: boolean): string {
  const hidden = open ? 0 : thread.comments.length - 1;
  return [thread.resolved ? 'resolved' : '', thread.outdated ? 'outdated' : '', hidden ? `+${hidden}` : '']
    .filter(Boolean)
    .join(' · ');
}

function ThreadComment({
  comment,
  note,
  showBody,
  repo,
  onToggle,
}: {
  comment: ReviewComment;
  note: string;
  showBody: boolean;
  repo: ReviewThreadTarget;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-panel-edge px-1.5 py-[2px] first:border-t-0">
      <header className="flex items-center gap-1 text-[9px] leading-4 text-ink-dim">
        <Portrait comment={comment} />
        <button type="button" onClick={onToggle} className="min-w-0 shrink truncate text-left text-ink">
          {comment.author}
        </button>
        <span className="min-w-0 flex-1 truncate">{note}</span>
        <RelativeTime iso={comment.createdAt} className="shrink-0" />
      </header>
      {showBody && (
        <HoverCardHtml
          className="markdown-body break-words pr-6 text-ink"
          html={renderMarkdown(comment.body, repo)}
          tooltipStyle
        />
      )}
    </div>
  );
}

function Portrait({ comment }: { comment: ReviewComment }) {
  if (!comment.avatarUrl) return <span className="h-3 w-3 shrink-0 rounded-full bg-btn" />;
  return <img src={comment.avatarUrl} alt="" width={12} height={12} className="h-3 w-3 shrink-0 rounded-full" />;
}

function ThreadActions({
  thread,
  busy,
  onReply,
  onReact,
  onResolve,
}: {
  thread: ReviewThread;
  busy: boolean;
  onReply: () => void;
  onReact: () => void;
  onResolve: (() => void) | null;
}) {
  const first = thread.comments[0];
  return (
    <div className="absolute bottom-0 right-0 flex items-center gap-0.5 rounded-tl border-l border-t border-panel-edge bg-tip px-1 text-[10px] opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
      <HoverCardTrigger label="Reply" focusable={false} tooltipStyle>
        <button type="button" aria-label="Reply" onClick={onReply} disabled={busy} className={ACTION}>
          ↩
        </button>
      </HoverCardTrigger>
      <HoverCardTrigger label={first?.viewerReacted ? 'Remove 👍' : 'React 👍'} focusable={false} tooltipStyle>
        <button
          type="button"
          aria-label={first?.viewerReacted ? 'Remove thumbs up reaction' : 'Add thumbs up reaction'}
          onClick={onReact}
          disabled={busy}
          className={`${ACTION} ${first?.viewerReacted ? 'text-accent' : ''}`}
        >
          👍{first?.thumbsUp || ''}
        </button>
      </HoverCardTrigger>
      {onResolve && (
        <HoverCardTrigger label={thread.resolved ? 'Unresolve' : 'Resolve'} focusable={false} tooltipStyle>
          <button
            type="button"
            aria-label={thread.resolved ? 'Unresolve thread' : 'Resolve thread'}
            onClick={onResolve}
            disabled={busy}
            className={ACTION}
          >
            {thread.resolved ? '↺' : '✓'}
          </button>
        </HoverCardTrigger>
      )}
      <HoverCardTrigger label="Open on GitHub" focusable={false} tooltipStyle>
        <a href={first?.url} target="_blank" rel="noopener noreferrer" aria-label="Open on GitHub" className={ACTION}>
          ↗
        </a>
      </HoverCardTrigger>
    </div>
  );
}

function sendNewThread(
  target: ReviewThreadTarget,
  thread: ReviewThread,
  commitId: string,
  body: string,
  token: string | null,
): Promise<unknown> {
  if (target.number === null || thread.line === null) {
    return Promise.reject(new Error('Line comments need an open pull request'));
  }
  const draft = { body, commitId, path: thread.path, line: thread.line, side: thread.side };
  return apiPostJson(reviewCommentPath(target.owner, target.repo, target.number), token, draft);
}

function sendReply(
  target: ReviewThreadTarget,
  thread: ReviewThread,
  body: string,
  token: string | null,
): Promise<unknown> {
  if (target.number === null) return Promise.reject(new Error('Replies need a pull request'));
  return apiPostJson(reviewReplyPath(target.owner, target.repo, target.number, thread.rootId), token, { body });
}

function sendResolve(thread: ReviewThread, token: string | null): Promise<unknown> {
  if (thread.threadId === null) return Promise.reject(new Error('Thread cannot be resolved'));
  return apiPost(reviewResolvePath(thread.threadId, !thread.resolved), token);
}

function sendReaction(comment: ReviewComment | undefined, token: string | null): Promise<unknown> {
  if (!comment) return Promise.reject(new Error('Nothing to react to'));
  return apiPost(reviewReactionPath(comment.nodeId, !comment.viewerReacted), token);
}
