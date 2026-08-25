'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { parseGithubAccess } from '@/features/github-auth/githubAccess';
import { sessionFromGrant } from '@/features/sources/githubSession';
import { addSource, writeGithubSession } from '@/features/sources/sourceStore';

export default function ConnectPage() {
  const router = useRouter();
  useEffect(() => {
    const granted = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = granted.get('token');
    if (token) {
      writeGithubSession(sessionFromGrant(grantOf(granted, token), parseGithubAccess(granted.get('access'))));
      addSource({ kind: 'viewer' });
    }
    window.history.replaceState(null, '', '/connect');
    router.replace(token ? '/' : `/?error=${encodeURIComponent('GitHub sign-in returned no token')}`);
  }, [router]);
  return <p className="p-6 text-xs text-ink-dim">Connecting GitHub…</p>;
}

function grantOf(granted: URLSearchParams, token: string) {
  return {
    token,
    refreshToken: granted.get('refresh_token'),
    expiresIn: seconds(granted.get('expires_in')),
    refreshExpiresIn: seconds(granted.get('refresh_token_expires_in')),
  };
}

function seconds(raw: string | null): number | null {
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}
