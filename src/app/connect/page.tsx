'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { addSource, writeGithubToken } from '@/features/sources/sourceStore';

export default function ConnectPage() {
  const router = useRouter();
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    if (token) {
      writeGithubToken(token);
      addSource({ kind: 'viewer' });
    }
    window.history.replaceState(null, '', '/connect');
    router.replace(token ? '/' : `/?error=${encodeURIComponent('GitHub sign-in returned no token')}`);
  }, [router]);
  return <p className="text-xs text-ink-dim">Connecting GitHub…</p>;
}
