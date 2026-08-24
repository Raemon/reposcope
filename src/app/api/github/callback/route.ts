import { NextResponse } from 'next/server';
import { oauthConfig, type OAuthConfig } from '@/features/github-auth/githubOAuthConfig';
import { consumeOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

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
    const token = await exchangeCode(code, `${origin}/api/github/callback`, config);
    return NextResponse.redirect(`${origin}/connect#token=${encodeURIComponent(token)}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'GitHub sign-in failed');
  }
}

async function exchangeCode(code: string, redirectUri: string, config: OAuthConfig): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'shoggoth-reviews' },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!response.ok) throw new Error(`GitHub token exchange failed (${response.status})`);
  const body = (await response.json()) as TokenResponse;
  if (!body.access_token) throw new Error(`GitHub token exchange failed: ${body.error_description ?? body.error ?? 'no token'}`);
  return body.access_token;
}
