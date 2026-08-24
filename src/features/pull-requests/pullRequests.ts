import { dropCachedScope } from '@/features/codebases/githubCache';
import { GithubRequestError, githubBytes, githubGraphql, githubJson, githubSend } from '@/features/codebases/githubRequest';
import { imageTypeOf } from './imageFiles';
import type { RepoRef } from '@/features/sources/parseRepoLink';

export interface PullRequestSummary {
  number: number;
  title: string;
  author: string;
  updatedAt: string;
  draft: boolean;
  state: string;
  merged: boolean;
}

export interface CrossRepoPull extends PullRequestSummary {
  owner: string;
  repo: string;
}

export interface CrossRepoPulls {
  pulls: CrossRepoPull[];
  failures: { repo: string; message: string }[];
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface ChangedFile {
  filename: string;
  previousFilename: string | null;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface ChangedFileSet {
  baseRef: string;
  headRef: string;
  files: ChangedFile[];
}

export interface FileBlob {
  dataUrl: string | null;
  byteSize: number;
}

export interface PullRequestCommits {
  pull: PullRequestSummary;
  body: string | null;
  baseRef: string;
  headRef: string;
  additions: number;
  deletions: number;
  commits: CommitSummary[];
}

export interface FileEdit {
  path: string;
  startLine: number;
  endLine: number;
  original: string;
  updated: string;
  message: string;
}

export interface EditResult {
  sha: string;
  branch: string;
}

export interface MergeResult {
  merged: boolean;
  message: string;
}

export interface PullComment {
  id: number;
  author: string;
  createdAt: string;
  body: string;
  path: string | null;
}

interface GithubPull {
  number: number;
  node_id: string;
  title: string;
  body?: string | null;
  user: { login: string } | null;
  updated_at: string;
  draft?: boolean;
  state: string;
  merged?: boolean;
  base: { ref: string; sha: string };
  head: { ref: string; sha: string; repo?: { full_name: string } | null };
  additions?: number;
  deletions?: number;
}

interface GithubComment {
  id: number;
  user: { login: string } | null;
  created_at: string;
  body?: string;
  path?: string;
}

interface GithubFileContents {
  sha: string;
  content?: string;
  encoding?: string;
}

interface GithubChangedFile {
  filename: string;
  previous_filename?: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

interface GithubCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } | null };
  author: { login: string } | null;
  parents?: { sha: string }[];
  files?: GithubChangedFile[];
}

const API = 'https://api.github.com';
const FILE_PAGE = 100;
const MAX_FILE_PAGES = 10;
const MAX_BLOB_BYTES = 6 * 1024 * 1024;
export const MAX_SCANNED_REPOS = 60;
const SCAN_WORKERS = 6;

export async function listPullRequests(owner: string, name: string): Promise<PullRequestSummary[]> {
  const pulls = await githubJson<GithubPull[]>(
    `${API}/repos/${owner}/${name}/pulls?state=open&sort=updated&direction=desc&per_page=50`,
  );
  return pulls.map(summarizePull);
}

export async function listPullRequestsAcross(repos: RepoRef[]): Promise<CrossRepoPulls> {
  const queue = repos.slice(0, MAX_SCANNED_REPOS);
  const pulls: CrossRepoPull[] = [];
  const failures: { repo: string; message: string }[] = [];
  const scan = async () => {
    for (let repo = queue.shift(); repo; repo = queue.shift()) {
      try {
        const found = await listPullRequests(repo.owner, repo.name);
        pulls.push(...found.map((pull) => ({ ...pull, owner: repo.owner, repo: repo.name })));
      } catch (error) {
        failures.push({
          repo: `${repo.owner}/${repo.name}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(SCAN_WORKERS, queue.length) }, scan));
  pulls.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { pulls, failures };
}

export async function describePullRequest(owner: string, name: string, number: number): Promise<PullRequestCommits> {
  const [pull, commits] = await Promise.all([
    githubJson<GithubPull>(`${API}/repos/${owner}/${name}/pulls/${number}`),
    githubJson<GithubCommit[]>(`${API}/repos/${owner}/${name}/pulls/${number}/commits?per_page=100`),
  ]);
  return {
    pull: summarizePull(pull),
    body: pull.body ?? null,
    baseRef: pull.base.ref,
    headRef: pull.head.ref,
    additions: pull.additions ?? 0,
    deletions: pull.deletions ?? 0,
    commits: commits.map(summarizeCommit).reverse(),
  };
}

export async function mergePullRequest(owner: string, name: string, number: number): Promise<MergeResult> {
  const pull = await githubJson<GithubPull>(`${API}/repos/${owner}/${name}/pulls/${number}`);
  if (pull.draft) await markReadyForReview(pull.node_id);
  const result = await githubSend<{ merged?: boolean; message?: string }>(
    `${API}/repos/${owner}/${name}/pulls/${number}/merge`,
    'PUT',
    {},
  );
  return { merged: result.merged ?? false, message: result.message ?? '' };
}

async function markReadyForReview(pullId: string): Promise<void> {
  try {
    await githubGraphql(
      'mutation($pullId: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $pullId }) { pullRequest { isDraft } } }',
      { pullId },
    );
  } catch (error) {
    if (!alreadyReady(error)) throw error;
  }
}

function alreadyReady(error: unknown): boolean {
  return error instanceof Error && /not a draft/i.test(error.message);
}

export async function listPullRequestFiles(owner: string, name: string, number: number): Promise<ChangedFileSet> {
  const pull = await githubJson<GithubPull>(`${API}/repos/${owner}/${name}/pulls/${number}`);
  const files: ChangedFile[] = [];
  for (let page = 1; page <= MAX_FILE_PAGES; page += 1) {
    const batch = await githubJson<GithubChangedFile[]>(
      `${API}/repos/${owner}/${name}/pulls/${number}/files?per_page=${FILE_PAGE}&page=${page}`,
    );
    files.push(...batch.map(changedFile));
    if (batch.length < FILE_PAGE) break;
  }
  return { baseRef: pull.base.sha, headRef: pull.head.sha, files };
}

export async function commitFileEdit(
  owner: string,
  name: string,
  number: number,
  edit: FileEdit,
): Promise<EditResult> {
  const pull = await githubJson<GithubPull>(`${API}/repos/${owner}/${name}/pulls/${number}`);
  if (pull.state !== 'open') throw new GithubRequestError(409, `Pull request #${number} is ${pull.state}`);
  const target = pull.head.repo?.full_name ?? `${owner}/${name}`;
  const branch = pull.head.ref;
  const contents = `${API}/repos/${target}/contents/${encodePath(edit.path)}`;
  const held = await githubJson<GithubFileContents>(`${contents}?ref=${encodeURIComponent(branch)}`);
  const commit = await githubSend<{ commit?: { sha?: string } }>(contents, 'PUT', {
    message: edit.message,
    content: Buffer.from(spliceLines(decodeContents(held), edit), 'utf8').toString('base64'),
    sha: held.sha,
    branch,
  });
  await dropCachedScope(`repos/${owner}/${name}`);
  return { sha: commit.commit?.sha ?? '', branch };
}

function decodeContents(held: GithubFileContents): string {
  if (held.encoding !== 'base64' || typeof held.content !== 'string') {
    throw new GithubRequestError(422, 'That file is too large to edit from here');
  }
  return Buffer.from(held.content, 'base64').toString('utf8');
}

function spliceLines(text: string, edit: FileEdit): string {
  const lines = text.split('\n');
  if (edit.endLine > lines.length) throw new GithubRequestError(409, staleMessage(edit.path));
  const standing = lines.slice(edit.startLine - 1, edit.endLine).join('\n');
  if (standing !== edit.original) throw new GithubRequestError(409, staleMessage(edit.path));
  return [...lines.slice(0, edit.startLine - 1), ...edit.updated.split('\n'), ...lines.slice(edit.endLine)].join('\n');
}

function staleMessage(path: string): string {
  return `${path} has changed on the branch since this diff loaded; reload before editing`;
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export async function listPullComments(owner: string, name: string, number: number): Promise<PullComment[]> {
  const [conversation, review] = await Promise.all([
    githubJson<GithubComment[]>(`${API}/repos/${owner}/${name}/issues/${number}/comments?per_page=100`),
    githubJson<GithubComment[]>(`${API}/repos/${owner}/${name}/pulls/${number}/comments?per_page=100`),
  ]);
  return [...conversation, ...review].map(pullComment).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listCommitFiles(owner: string, name: string, sha: string): Promise<ChangedFileSet> {
  const commit = await githubJson<GithubCommit>(`${API}/repos/${owner}/${name}/commits/${sha}`);
  return {
    baseRef: commit.parents?.[0]?.sha ?? commit.sha,
    headRef: commit.sha,
    files: (commit.files ?? []).map(changedFile),
  };
}

export async function readFileBlob(owner: string, name: string, ref: string, path: string): Promise<FileBlob> {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const bytes = await githubBytes(
    `${API}/repos/${owner}/${name}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
    'application/vnd.github.raw',
  );
  if (bytes.byteLength > MAX_BLOB_BYTES) return { dataUrl: null, byteSize: bytes.byteLength };
  const type = imageTypeOf(path) ?? 'application/octet-stream';
  return {
    dataUrl: `data:${type};base64,${Buffer.from(bytes).toString('base64')}`,
    byteSize: bytes.byteLength,
  };
}

function changedFile(file: GithubChangedFile): ChangedFile {
  return {
    filename: file.filename,
    previousFilename: file.previous_filename ?? null,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? null,
  };
}

function pullComment(comment: GithubComment): PullComment {
  return {
    id: comment.id,
    author: comment.user?.login ?? '',
    createdAt: comment.created_at,
    body: comment.body ?? '',
    path: comment.path ?? null,
  };
}

function summarizePull(pull: GithubPull): PullRequestSummary {
  return {
    number: pull.number,
    title: pull.title,
    author: pull.user?.login ?? '',
    updatedAt: pull.updated_at,
    draft: pull.draft ?? false,
    state: pull.state,
    merged: pull.merged ?? false,
  };
}

function summarizeCommit(commit: GithubCommit): CommitSummary {
  return {
    sha: commit.sha,
    message: commit.commit.message.split('\n')[0] ?? '',
    author: commit.author?.login ?? commit.commit.author?.name ?? '',
    date: commit.commit.author?.date ?? '',
  };
}
