'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { parseGithubAccess } from '@/features/github-auth/githubAccess';
import { grantFromParams } from '@/features/github-auth/grantParams';
import { sessionFromGrant } from '@/features/sources/githubSession';
import { addSource, writeGithubSession } from '@/features/sources/sourceStore';
import { Note } from '@/features/surface-ui/Note';

export default function ConnectPage() {
  const router = useRouter();
  useEffect(() => {
    const granted = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = granted.get('token');
    if (token) {
      writeGithubSession(sessionFromGrant(grantFromParams(granted, token), parseGithubAccess(granted.get('access'))));
      addSource({ kind: 'viewer' });
    }
    window.history.replaceState(null, '', '/connect');
    router.replace(token ? '/' : `/?error=${encodeURIComponent('GitHub sign-in returned no token')}`);
  }, [router]);
  return <Note tone="dim" className="m-4">Connecting to GitHub…</Note>;
}
