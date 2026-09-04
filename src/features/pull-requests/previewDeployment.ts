import { githubJson } from '@/features/codebases/githubRequest';

interface GithubDeployment {
  id: number;
  environment?: string;
  production_environment?: boolean;
  creator: { login: string } | null;
  created_at: string;
}

interface GithubDeploymentStatus {
  state: string;
  environment_url?: string | null;
  target_url?: string | null;
  created_at: string;
}

export type PreviewState = 'ready' | 'building' | 'failed' | 'none';

export interface CommitPreview {
  sha: string;
  state: PreviewState;
  url: string | null;
  deployedAt: string | null;
}

const API = 'https://api.github.com';
const PREVIEW_BOT = 'vercel[bot]';
const FAILED_STATES = ['failure', 'error'];

export async function commitPreview(owner: string, name: string, sha: string, fresh = false): Promise<CommitPreview> {
  const query = new URLSearchParams({ sha, per_page: '20' });
  const deployments = await githubJson<GithubDeployment[]>(`${API}/repos/${owner}/${name}/deployments?${query}`, fresh);
  const preview = deployments.find(isVercelPreview);
  if (!preview) return { sha, state: 'none', url: null, deployedAt: null };
  return { sha, ...(await describeDeployment(owner, name, preview, fresh)) };
}

function isVercelPreview(deployment: GithubDeployment): boolean {
  if (deployment.creator?.login !== PREVIEW_BOT) return false;
  return deployment.production_environment !== true && deployment.environment !== 'Production';
}

async function describeDeployment(
  owner: string,
  name: string,
  deployment: GithubDeployment,
  fresh: boolean,
): Promise<Omit<CommitPreview, 'sha'>> {
  const statuses = await githubJson<GithubDeploymentStatus[]>(
    `${API}/repos/${owner}/${name}/deployments/${deployment.id}/statuses?per_page=20`,
    fresh,
  );
  const live = statuses.find((status) => status.state === 'success');
  if (live) return { state: 'ready', url: liveUrl(live), deployedAt: live.created_at };
  const failed = statuses.some((status) => FAILED_STATES.includes(status.state));
  return { state: failed ? 'failed' : 'building', url: null, deployedAt: deployment.created_at };
}

function liveUrl(status: GithubDeploymentStatus): string | null {
  return status.environment_url ?? status.target_url ?? null;
}
