'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { titleFor } from './documentTitles';
import { pullBeingRead, repoBeingRead } from './repoPaths';
import { useCurrentPull } from '@/features/pull-requests/currentPullStore';

export function DocumentTitle() {
  const pathname = usePathname();
  const repo = repoBeingRead(pathname);
  const loaded = useCurrentPull(repo?.owner ?? '', repo?.name ?? '', pullBeingRead(pathname) ?? 0);
  const title = titleFor(pathname, loaded?.pull.title ?? null);
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
