import type { OAuthConfig } from './githubOAuthConfig';

const TOKEN_URL = 'https://github.com/login/oauth/access_token';

export interface GithubGrant {
  token: string;
  refreshToken: string | null;
  expiresIn: number | null;
  refreshExpiresIn: number | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  refresh_token_expires_in?: number | string;
  error?: string;
  error_description?: string;
}

export function exchangeCode(code: string, redirectUri: string, config: OAuthConfig): Promise<GithubGrant> {
  return requestGrant(config, { code, redirect_uri: redirectUri });
}

export function refreshGrant(refreshToken: string, config: OAuthConfig): Promise<GithubGrant> {
  return requestGrant(config, { grant_type: 'refresh_token', refresh_token: refreshToken });
}

async function requestGrant(config: OAuthConfig, fields: Record<string, string>): Promise<GithubGrant> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'reposcope' },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, ...fields }),
  });
  if (!response.ok) throw new Error(`GitHub token exchange failed (${response.status})`);
  return grantOf((await response.json()) as TokenResponse);
}

function grantOf(body: TokenResponse): GithubGrant {
  if (!body.access_token) throw new Error(`GitHub token exchange failed: ${body.error_description ?? body.error ?? 'no token'}`);
  return {
    token: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresIn: lifetime(body.expires_in),
    refreshExpiresIn: lifetime(body.refresh_token_expires_in),
  };
}

function lifetime(value: number | string | undefined): number | null {
  const seconds = typeof value === 'string' ? Number(value) : value;
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
