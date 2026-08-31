import { NextResponse } from 'next/server';

export const NOT_CONFIGURED = 'GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET';
export const RELAY_BROKEN = 'GitHub sign-in relay failed: set the same GITHUB_OAUTH_RELAY_SECRET on this deployment and its proxy';

export type Fail = (message: string) => NextResponse;

export function callbackUrl(origin: string): string {
  return `${origin}/api/github/callback`;
}

export function failHome(origin: string): Fail {
  return (message) => NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
}
