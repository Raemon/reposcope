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
  try {
    const deployments = await githubJson<GithubDeployment[]>(
      `${API}/repos/${owner}/${name}/deployments?sha=${sha}&per_page=20`,
    );
    const preview = deployments.find(isVercelPreview);
    return preview ? await liveDeploymentUrl(owner, name, preview.id) : null;
  } catch {
    return null;
  }
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
