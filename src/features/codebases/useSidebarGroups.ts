'use client';

import { useMemo } from 'react';
import { sidebarGroups, type SidebarGroup } from './sidebarGroups';
import { useSourceResults } from './useSourceResults';
import { useGithubAccess, useGithubToken, useSources, useStoreReady } from '@/features/sources/sourceStore';

export function useSidebarGroups(): SidebarGroup[] {
  const ready = useStoreReady();
  const sources = useSources();
  const token = useGithubToken();
  const access = useGithubAccess();
  const results = useSourceResults(sources, token, ready, access);
  return useMemo(() => sidebarGroups(sources, results), [sources, results]);
}
