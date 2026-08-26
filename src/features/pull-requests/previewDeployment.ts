import { githubJson } from '@/features/codebases/githubRequest';

interface GithubDeployment {
  id: number;
  environment?: string;
  creator: { login: string } | null;
}

interface GithubDeploymentStatus {
  state: string;
  environment_url?: string | null;
  target_url?: string | null;
}

const API = 'https://api.github.com';
const PREVIEW_BOT = 'vercel[bot]';
const PREVIEW_ENVIRONMENT = 'Preview';

export async function previewDeploymentUrl(owner: string, name: string, sha: string, fresh = false): Promise<string | null> {
  try {
    const deployments = await githubJson<GithubDeployment[]>(
      `${API}/repos/${owner}/${name}/deployments?sha=${sha}&per_page=20`,
      fresh,
    );
    const preview = deployments.find(isVercelPreview);
    return preview ? await liveDeploymentUrl(owner, name, preview.id, fresh) : null;
  } catch {
    return null;
  }
}

// Vercel sets production_environment: false even on Production, so match by name.
function isVercelPreview(deployment: GithubDeployment): boolean {
  return deployment.creator?.login === PREVIEW_BOT && deployment.environment === PREVIEW_ENVIRONMENT;
}

async function liveDeploymentUrl(owner: string, name: string, deployment: number, fresh: boolean): Promise<string | null> {
  const statuses = await githubJson<GithubDeploymentStatus[]>(
    `${API}/repos/${owner}/${name}/deployments/${deployment}/statuses?per_page=20`,
    fresh,
  );
  const live = statuses.find((status) => status.state === 'success');
  return live?.environment_url || live?.target_url || null;
}
