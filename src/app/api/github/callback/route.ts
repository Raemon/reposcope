import { NextResponse } from 'next/server';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { exchangeCode } from '@/features/github-auth/githubOAuthTokens';
import { grantToParams } from '@/features/github-auth/grantParams';
import { allowedReturnOrigin } from '@/features/github-auth/oauthProxy';
import { accessFromState, consumeOauthState, returnOriginFromState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const query = new URL(request.url).searchParams;
  const matched = matchedState(query.get('state'), await consumeOauthState());
  const requested = matched ? returnOriginFromState(matched) : null;
  const landing = allowedReturnOrigin(requested) ?? origin;
  const fail = (message: string) => NextResponse.redirect(`${landing}/?error=${encodeURIComponent(message)}`);

  const config = oauthConfig();
  if (!config) return fail('GitHub sign-in is not configured');
  if (requested && landing === origin) return fail(`GitHub sign-in cannot return to ${requested}`);
  const denied = query.get('error_description') ?? query.get('error');
  if (denied) return fail(`GitHub sign-in failed: ${denied}`);
  const code = query.get('code');
  if (!code || !matched) return fail('GitHub sign-in state mismatch; try again');
  try {
    const grant = await exchangeCode(code, `${origin}/api/github/callback`, config);
    return NextResponse.redirect(`${landing}/connect#${grantToParams(grant, accessFromState(matched))}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'GitHub sign-in failed');
  }
}

function matchedState(state: string | null, expected: string | null): string | null {
  return state && expected && state === expected ? state : null;
}
