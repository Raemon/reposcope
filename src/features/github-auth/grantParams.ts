import { lifetime, type GithubGrant } from './githubOAuthTokens';

export function grantToParams(grant: GithubGrant, access: string): URLSearchParams {
  const granted = new URLSearchParams({ token: grant.token, access });
  if (grant.refreshToken) granted.set('refresh_token', grant.refreshToken);
  if (grant.expiresIn) granted.set('expires_in', String(grant.expiresIn));
  if (grant.refreshExpiresIn) granted.set('refresh_token_expires_in', String(grant.refreshExpiresIn));
  return granted;
}

export function grantFromParams(granted: URLSearchParams, token: string): GithubGrant {
  return {
    token,
    refreshToken: granted.get('refresh_token'),
    expiresIn: lifetime(granted.get('expires_in')),
    refreshExpiresIn: lifetime(granted.get('refresh_token_expires_in')),
  };
}
