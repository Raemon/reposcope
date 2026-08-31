import { NextResponse } from 'next/server';
import { parseGithubAccess, oauthScope } from '@/features/github-auth/githubAccess';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { oauthProxy, relayConfigured, signReturn, verifiedReturn } from '@/features/github-auth/oauthProxy';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

const RELAY_UNCONFIGURED = 'GitHub sign-in relay is not configured: set GITHUB_OAUTH_RELAY_SECRET on this deployment and its proxy';
const RELAY_UNVERIFIED = 'GitHub sign-in cannot verify the deployment it was asked to return to: check that GITHUB_OAUTH_RELAY_SECRET matches on both';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const params = new URL(request.url).searchParams;
  const access = parseGithubAccess(params.get('access'));
  const fail = (message: string) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  const proxy = oauthProxy(request);
  if (proxy) {
    const sig = signReturn(origin);
    if (!sig) return fail(RELAY_UNCONFIGURED);
    const relay = new URLSearchParams({ access, return: origin, sig });
    return NextResponse.redirect(`${proxy}/api/github/connect?${relay}`);
  }
  const config = oauthConfig();
  if (!config) return fail('GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  const returnTo = verifiedReturn(params.get('return'), params.get('sig'));
  if (params.has('return') && !returnTo) {
    return fail(relayConfigured() ? RELAY_UNVERIFIED : RELAY_UNCONFIGURED);
  }
  const state = await issueOauthState(access, returnTo);
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/github/callback`,
    scope: oauthScope(access),
    state,
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${query}`);
}
