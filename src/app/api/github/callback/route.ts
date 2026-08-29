import { NextResponse } from 'next/server';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { exchangeCode } from '@/features/github-auth/githubOAuthTokens';
import { grantToParams } from '@/features/github-auth/grantParams';
import { allowedReturn } from '@/features/github-auth/oauthProxy';
import { accessFromState, consumeOauthState, returnFromState } from '@/features/github-auth/oauthState';
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
    const landing = allowedReturn(returnFromState(state)) ?? origin;
    return NextResponse.redirect(`${landing}/connect#${grantToParams(grant, accessFromState(state))}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'GitHub sign-in failed');
  }
}
