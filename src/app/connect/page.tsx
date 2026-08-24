'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { parseGithubAccess } from '@/features/github-auth/githubAccess';
import { addSource, writeGithubToken } from '@/features/sources/sourceStore';

export default function ConnectPage() {
  const router = useRouter();
  useEffect(() => {
    const granted = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = granted.get('token');
    if (token) {
      writeGithubToken(token, parseGithubAccess(granted.get('access')));
      addSource({ kind: 'viewer' });
    }
    window.history.replaceState(null, '', '/connect');
    router.replace(token ? '/' : `/?error=${encodeURIComponent('GitHub sign-in returned no token')}`);
  }, [router]);
  return <p className="p-6 text-xs text-ink-dim">Connecting GitHub…</p>;
}
