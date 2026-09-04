import { githubJson } from '@/features/codebases/githubRequest';

interface GithubDeployment {
  id: number;
  production_environment?: boolean;
  creator: { login: string } | null;
}

interface GithubDeploymentStatus {
  state: string;
  environment_url?: string | null;
  target_url?: string | null;
}

const API = 'https://api.github.com';
const PREVIEW_BOT = 'vercel[bot]';

export async function previewDeploymentUrl(owner: string, name: string, sha: string): Promise<string | null> {
  return newestPreviewUrl(owner, name, { sha }).catch(() => null);
}

export async function previewUrlForRef(owner: string, name: string, ref: string): Promise<string | null> {
  return newestPreviewUrl(owner, name, { ref });
}

async function newestPreviewUrl(owner: string, name: string, pick: Record<string, string>): Promise<string | null> {
  const query = new URLSearchParams({ ...pick, per_page: '20' });
  const deployments = await githubJson<GithubDeployment[]>(`${API}/repos/${owner}/${name}/deployments?${query}`);
  const preview = deployments.find(isVercelPreview);
  return preview ? await liveDeploymentUrl(owner, name, preview.id) : null;
}

function isVercelPreview(deployment: GithubDeployment): boolean {
  return deployment.creator?.login === PREVIEW_BOT && deployment.production_environment !== true;
}

async function liveDeploymentUrl(owner: string, name: string, deployment: number): Promise<string | null> {
  const statuses = await githubJson<GithubDeploymentStatus[]>(
    `${API}/repos/${owner}/${name}/deployments/${deployment}/statuses?per_page=20`,
  );
  const live = statuses.find((status) => status.state === 'success');
  return live?.environment_url ?? live?.target_url ?? null;
}
