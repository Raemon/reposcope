import { NextResponse } from 'next/server';
import { parseGithubAccess, oauthScope, type GithubAccess } from '@/features/github-auth/githubAccess';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { oauthProxy, signReturn, verifiedReturn } from '@/features/github-auth/oauthProxy';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

function relayParams(access: GithubAccess, origin: string): URLSearchParams {
  return new URLSearchParams({ access, return: origin, sig: signReturn(origin) });
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const params = new URL(request.url).searchParams;
  const access = parseGithubAccess(params.get('access'));
  const proxy = oauthProxy(request);
  if (proxy) return NextResponse.redirect(`${proxy}/api/github/connect?${relayParams(access, origin)}`);
  const fail = (message: string) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  const config = oauthConfig();
  if (!config) return fail('GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
  const returnTo = verifiedReturn(params.get('return'), params.get('sig'));
  if (params.has('return') && !returnTo) return fail('GitHub sign-in cannot return to an unrecognised deployment');
  const state = await issueOauthState(access, returnTo);
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/github/callback`,
    scope: oauthScope(access),
    state,
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${query}`);
}
