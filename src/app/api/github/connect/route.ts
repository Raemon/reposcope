import { NextResponse } from 'next/server';
import { parseGithubAccess, oauthScope, type GithubAccess } from '@/features/github-auth/githubAccess';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { oauthProxy, signReturn, verifiedReturn } from '@/features/github-auth/oauthProxy';
import { callbackUrl, failHome, NOT_CONFIGURED, RELAY_BROKEN, type Fail } from '@/features/github-auth/oauthRoute';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

function relayToProxy(proxy: string, origin: string, access: GithubAccess, fail: Fail) {
  const sig = signReturn(origin);
  if (!sig) return fail(RELAY_BROKEN);
  const relay = new URLSearchParams({ access, return: origin, sig });
  return NextResponse.redirect(`${proxy}/api/github/connect?${relay}`);
}

async function authorizeUrl(origin: string, access: GithubAccess, returnTo: string | null, clientId: string) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(origin),
    scope: oauthScope(access),
    state: await issueOauthState(access, returnTo),
  });
  return `https://github.com/login/oauth/authorize?${query}`;
}

async function startSignIn(origin: string, params: URLSearchParams, access: GithubAccess, fail: Fail) {
  const config = oauthConfig();
  if (!config) return fail(NOT_CONFIGURED);
  const returnTo = verifiedReturn(params.get('return'), params.get('sig'));
  if (params.has('return') && !returnTo) return fail(RELAY_BROKEN);
  return NextResponse.redirect(await authorizeUrl(origin, access, returnTo, config.clientId));
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const params = new URL(request.url).searchParams;
  const access = parseGithubAccess(params.get('access'));
  const fail = failHome(origin);
  const proxy = oauthProxy(request);
  return proxy ? relayToProxy(proxy, origin, access, fail) : startSignIn(origin, params, access, fail);
}
