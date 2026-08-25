'use client';

import type { GithubGrant } from '@/features/github-auth/githubOAuthTokens';
import { readGithubAccess, readGithubRenewal, readGithubToken, signOutGithub, writeGithubSession, type GithubSession } from './sourceStore';
import type { GithubAccess } from '@/features/github-auth/githubAccess';

const RENEW_MARGIN_MS = 5 * 60_000;
const RENEW_LOCK = 'reposcope.githubRenewal';
const SIGN_IN_EXPIRED = 'GitHub sign-in expired';
let renewing: Promise<string | null> | null = null;

class RefreshRejectedError extends Error {}

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

export async function replacementGithubToken(rejected: string | null): Promise<string | null> {
  const stored = readGithubToken();
  if (stored !== null && stored !== rejected) return stored;
  return renewGithubToken();
}

export function renewGithubToken(): Promise<string | null> {
  renewing ??= renewLocked().finally(() => {
    renewing = null;
  });
  return renewing;
}

async function renewLocked(): Promise<string | null> {
  const before = readGithubRenewal().refreshToken;
  if (typeof navigator === 'undefined' || !navigator.locks) return renew(before);
  return await navigator.locks.request(RENEW_LOCK, () => renew(before));
}

async function renew(before: string | null): Promise<string | null> {
  const { refreshToken, refreshExpiresAt } = readGithubRenewal();
  if (refreshToken !== before) return readGithubToken();
  if (!refreshToken || expired(refreshExpiresAt)) return signedOut();
  return attemptRefresh(refreshToken, readGithubAccess());
}

async function attemptRefresh(refreshToken: string, access: GithubAccess): Promise<string | null> {
  try {
    const grant = await postRefresh(refreshToken);
    return renewalStillHolds(refreshToken) ? adoptGrant(grant, access) : readGithubToken();
  } catch (error) {
    if (!renewalStillHolds(refreshToken)) return readGithubToken();
    return error instanceof RefreshRejectedError ? signedOut() : null;
  }
}

function adoptGrant(grant: GithubGrant, access: GithubAccess): string {
  const session = sessionFromGrant(grant, access);
  writeGithubSession(session);
  return session.token;
}

function signedOut(): null {
  signOutGithub(SIGN_IN_EXPIRED);
  return null;
}

function renewalStillHolds(refreshToken: string): boolean {
  return readGithubRenewal().refreshToken === refreshToken;
}

async function postRefresh(refreshToken: string): Promise<GithubGrant> {
  const response = await fetch('/api/github/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (response.status === 401) throw new RefreshRejectedError('GitHub refresh token rejected');
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
