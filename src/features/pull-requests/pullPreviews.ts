import { githubJson } from '@/features/codebases/githubRequest';
import { previewBranchPrefix } from './freshPreviewBranch';
import { commitPreview, type CommitPreview } from './previewDeployment';
import { commitDate, commitTitle, type GithubCommit } from './pullRequests';
import { mapWithWorkers } from './workerPool';

const API = 'https://api.github.com';
const MAX_COMMITS = 25;
const MAX_BRANCHES = 10;
const PREVIEW_WORKERS = 6;

interface GithubRef {
  ref: string;
  object: { sha: string };
}

interface PreviewSubject {
  sha: string;
  forSha: string;
  branch: string | null;
  message: string;
  date: string;
}

export type PreviewEntry = PreviewSubject & CommitPreview;

export interface PullPreviews {
  headSha: string;
  entries: PreviewEntry[];
}

export async function listPullPreviews(owner: string, name: string, number: number, fresh: boolean): Promise<PullPreviews> {
  const [pull, commits] = await Promise.all([
    githubJson<{ head: { sha: string } }>(`${API}/repos/${owner}/${name}/pulls/${number}`, fresh),
    githubJson<GithubCommit[]>(`${API}/repos/${owner}/${name}/pulls/${number}/commits?per_page=100`, fresh),
  ]);
  const pullShas = new Set(commits.map((commit) => commit.sha));
  const branches = await previewBranches(owner, name, number, pullShas);
  const subjects = [...branches, ...recentCommitSubjects(commits)];
  const headSha = pull.head.sha;
  const entries = await mapWithWorkers(subjects, PREVIEW_WORKERS, (subject) => withPreview(owner, name, subject, fresh && subject.forSha === headSha));
  return { headSha, entries };
}

async function withPreview(owner: string, name: string, subject: PreviewSubject, fresh: boolean): Promise<PreviewEntry> {
  return { ...subject, ...(await commitPreview(owner, name, subject.sha, fresh)) };
}

function recentCommitSubjects(commits: GithubCommit[]): PreviewSubject[] {
  return commits.slice(-MAX_COMMITS).reverse().map((commit) => describe(commit, commit.sha, null));
}

async function previewBranches(owner: string, name: string, number: number, pullShas: Set<string>): Promise<PreviewSubject[]> {
  const refs = await githubJson<GithubRef[]>(
    `${API}/repos/${owner}/${name}/git/matching-refs/heads/${previewBranchPrefix(number)}`,
  );
  return Promise.all(refs.slice(-MAX_BRANCHES).reverse().map((ref) => previewBranchSubject(owner, name, ref, pullShas)));
}

async function previewBranchSubject(owner: string, name: string, ref: GithubRef, pullShas: Set<string>): Promise<PreviewSubject> {
  const commit = await githubJson<GithubCommit>(`${API}/repos/${owner}/${name}/commits/${ref.object.sha}`);
  return describe(commit, branchedFrom(commit, pullShas), ref.ref.replace(/^refs\/heads\//, ''));
}

function branchedFrom(commit: GithubCommit, pullShas: Set<string>): string {
  if (pullShas.has(commit.sha)) return commit.sha;
  return commit.parents?.[0]?.sha ?? commit.sha;
}

function describe(commit: GithubCommit, forSha: string, branch: string | null): PreviewSubject {
  return { sha: commit.sha, forSha, branch, message: commitTitle(commit), date: commitDate(commit) };
}
