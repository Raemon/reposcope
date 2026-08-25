import { githubGraphql, githubJson, githubSend } from '@/features/codebases/githubRequest';

const API = 'https://api.github.com';

export interface ReviewComment {
  id: number;
  nodeId: string;
  author: string;
  avatarUrl: string;
  createdAt: string;
  body: string;
  url: string;
  thumbsUp: number;
  viewerReacted: boolean;
}

export interface ReviewThread {
  rootId: number;
  threadId: string | null;
  path: string;
  line: number | null;
  side: 'left' | 'right';
  outdated: boolean;
  resolved: boolean;
  canResolve: boolean;
  comments: ReviewComment[];
}

interface GithubReviewComment {
  id: number;
  node_id: string;
  user: { login: string; avatar_url?: string } | null;
  created_at: string;
  body?: string;
  html_url: string;
  path: string;
  line?: number | null;
  original_line?: number | null;
  side?: string | null;
  in_reply_to_id?: number;
  reactions?: Record<string, number>;
}

interface ThreadState {
  threadId: string;
  resolved: boolean;
  canResolve: boolean;
  reactedIds: number[];
}

export async function listReviewThreads(owner: string, name: string, number: number): Promise<ReviewThread[]> {
  const comments = await githubJson<GithubReviewComment[]>(
    `${API}/repos/${owner}/${name}/pulls/${number}/comments?per_page=100`,
  );
  return withThreadState(groupThreads(comments), await threadStates(owner, name, number));
}

export async function replyToReviewThread(
  owner: string,
  name: string,
  number: number,
  rootId: number,
  body: string,
): Promise<ReviewComment> {
  const posted = await githubSend<GithubReviewComment>(
    `${API}/repos/${owner}/${name}/pulls/${number}/comments/${rootId}/replies`,
    'POST',
    { body },
  );
  return reviewComment(posted);
}

export async function setThreadResolved(threadId: string, resolved: boolean): Promise<{ resolved: boolean }> {
  const field = resolved ? 'resolveReviewThread' : 'unresolveReviewThread';
  const result = await githubGraphql<Record<string, { thread: { isResolved: boolean } }>>(
    `mutation($threadId: ID!) { ${field}(input: { threadId: $threadId }) { thread { isResolved } } }`,
    { threadId },
  );
  return { resolved: result[field]?.thread.isResolved ?? resolved };
}

export async function setCommentReaction(nodeId: string, reacted: boolean): Promise<{ reacted: boolean }> {
  const field = reacted ? 'addReaction' : 'removeReaction';
  await githubGraphql(
    `mutation($nodeId: ID!) { ${field}(input: { subjectId: $nodeId, content: THUMBS_UP }) { clientMutationId } }`,
    { nodeId },
  );
  return { reacted };
}

function groupThreads(comments: GithubReviewComment[]): ReviewThread[] {
  const byRoot = new Map<number, GithubReviewComment[]>();
  for (const comment of comments) {
    const root = comment.in_reply_to_id ?? comment.id;
    byRoot.set(root, [...(byRoot.get(root) ?? []), comment]);
  }
  return [...byRoot].map(([rootId, thread]) => threadOf(rootId, thread));
}

function threadOf(rootId: number, thread: GithubReviewComment[]): ReviewThread {
  const root = thread.find((comment) => comment.id === rootId) ?? thread[0]!;
  return {
    rootId,
    threadId: null,
    path: root.path,
    line: root.line ?? root.original_line ?? null,
    side: root.side === 'LEFT' ? 'left' : 'right',
    outdated: root.line == null,
    resolved: false,
    canResolve: false,
    comments: thread.map(reviewComment),
  };
}

function reviewComment(comment: GithubReviewComment): ReviewComment {
  return {
    id: comment.id,
    nodeId: comment.node_id,
    author: comment.user?.login ?? '',
    avatarUrl: comment.user?.avatar_url ?? '',
    createdAt: comment.created_at,
    body: comment.body ?? '',
    url: comment.html_url,
    thumbsUp: comment.reactions?.['+1'] ?? 0,
    viewerReacted: false,
  };
}

function withThreadState(threads: ReviewThread[], states: Map<number, ThreadState>): ReviewThread[] {
  return threads.map((thread) => {
    const state = states.get(thread.rootId);
    if (!state) return thread;
    return {
      ...thread,
      threadId: state.threadId,
      resolved: state.resolved,
      canResolve: state.canResolve,
      comments: thread.comments.map((comment) => ({
        ...comment,
        viewerReacted: state.reactedIds.includes(comment.id),
      })),
    };
  });
}

const THREAD_STATE_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          viewerCanResolve
          viewerCanUnresolve
          comments(first: 50) {
            nodes { databaseId reactionGroups { content viewerHasReacted } }
          }
        }
      }
    }
  }
}`;

interface GraphqlThread {
  id: string;
  isResolved: boolean;
  viewerCanResolve: boolean;
  viewerCanUnresolve: boolean;
  comments: {
    nodes: {
      databaseId: number;
      reactionGroups: { content: string; viewerHasReacted: boolean }[];
    }[];
  };
}

async function threadStates(owner: string, name: string, number: number): Promise<Map<number, ThreadState>> {
  const nodes = await queryThreadNodes(owner, name, number);
  return new Map(nodes.map((node) => [node.comments.nodes[0]?.databaseId ?? 0, threadState(node)]));
}

async function queryThreadNodes(owner: string, name: string, number: number): Promise<GraphqlThread[]> {
  try {
    const data = await githubGraphql<{
      repository: {
        pullRequest: { reviewThreads: { nodes: GraphqlThread[] } } | null;
      } | null;
    }>(THREAD_STATE_QUERY, { owner, name, number });
    return data.repository?.pullRequest?.reviewThreads.nodes ?? [];
  } catch {
    return [];
  }
}

function threadState(node: GraphqlThread): ThreadState {
  return {
    threadId: node.id,
    resolved: node.isResolved,
    canResolve: node.viewerCanResolve || node.viewerCanUnresolve,
    reactedIds: node.comments.nodes.filter(thumbedUp).map((comment) => comment.databaseId),
  };
}

function thumbedUp(comment: GraphqlThread['comments']['nodes'][number]): boolean {
  return comment.reactionGroups.some((group) => group.content === 'THUMBS_UP' && group.viewerHasReacted);
}
