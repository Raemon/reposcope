import { NextResponse } from 'next/server';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { exchangeCode, type GithubGrant } from '@/features/github-auth/githubOAuthTokens';
import { accessFromState, consumeOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const fail = (message: string) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  const config = oauthConfig();
  if (!config) return fail('GitHub sign-in is not configured');
  const query = new URL(request.url).searchParams;
  const denied = query.get('error_description') ?? query.get('error');
  if (denied) return fail(`GitHub sign-in failed: ${denied}`);
  const code = query.get('code');
  const state = query.get('state');
  const expected = await consumeOauthState();
  if (!code || !state || !expected || state !== expected) return fail('GitHub sign-in state mismatch; try again');
  try {
    const grant = await exchangeCode(code, `${origin}/api/github/callback`, config);
    return NextResponse.redirect(`${origin}/connect#${grantedParams(grant, accessFromState(state))}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'GitHub sign-in failed');
  }
}

function grantedParams(grant: GithubGrant, access: string): URLSearchParams {
  const granted = new URLSearchParams({ token: grant.token, access });
  if (grant.refreshToken) granted.set('refresh_token', grant.refreshToken);
  if (grant.expiresIn) granted.set('expires_in', String(grant.expiresIn));
  if (grant.refreshExpiresIn) granted.set('refresh_token_expires_in', String(grant.refreshExpiresIn));
  return granted;
}
