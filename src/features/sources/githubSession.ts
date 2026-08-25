'use client';

import type { GithubGrant } from '@/features/github-auth/githubOAuthTokens';
import { readGithubAccess, readGithubRenewal, writeGithubSession, type GithubSession } from './sourceStore';
import type { GithubAccess } from '@/features/github-auth/githubAccess';

const RENEW_MARGIN_MS = 5 * 60_000;
let renewing: Promise<string | null> | null = null;

export function sessionFromGrant(grant: GithubGrant, access: GithubAccess): GithubSession {
  return {
    token: grant.token,
    access,
    refreshToken: grant.refreshToken,
    expiresAt: deadline(grant.expiresIn),
    refreshExpiresAt: deadline(grant.refreshExpiresIn),
  };
}

export async function freshGithubToken(token: string | null): Promise<string | null> {
  if (!token || !nearingExpiry()) return token;
  return (await renewGithubToken()) ?? token;
}

export function renewGithubToken(): Promise<string | null> {
  renewing ??= renew().finally(() => {
    renewing = null;
  });
  return renewing;
}

async function renew(): Promise<string | null> {
  const { refreshToken, refreshExpiresAt } = readGithubRenewal();
  if (!refreshToken || expired(refreshExpiresAt)) return null;
  try {
    const session = sessionFromGrant(await postRefresh(refreshToken), readGithubAccess());
    writeGithubSession(session);
    return session.token;
  } catch {
    return null;
  }
}

async function postRefresh(refreshToken: string): Promise<GithubGrant> {
  const response = await fetch('/api/github/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) throw new Error(`GitHub refresh failed (${response.status})`);
  return (await response.json()) as GithubGrant;
}

function nearingExpiry(): boolean {
  const { expiresAt } = readGithubRenewal();
  return expiresAt !== null && expiresAt - Date.now() < RENEW_MARGIN_MS;
}

function expired(deadlineAt: number | null): boolean {
  return deadlineAt !== null && deadlineAt <= Date.now();
}

function deadline(lifetimeSeconds: number | null): number | null {
  return lifetimeSeconds === null ? null : Date.now() + lifetimeSeconds * 1000;
}
