import { NextResponse } from 'next/server';
import { oauthConfig } from '@/features/github-auth/githubOAuthConfig';
import { issueOauthState } from '@/features/github-auth/oauthState';
import { requestOrigin } from '@/features/github-auth/requestOrigin';

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const config = oauthConfig();
  if (!config) {
    const message = 'GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET';
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }
  const state = await issueOauthState();
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/github/callback`,
    scope: 'repo',
    state,
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${query}`);
}
