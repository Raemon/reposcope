import { oauthProxyConfigured } from './oauthProxy';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function oauthConfig(): OAuthConfig | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function githubSignInAvailable(): boolean {
  return oauthConfig() !== null || oauthProxyConfigured() !== null;
}
