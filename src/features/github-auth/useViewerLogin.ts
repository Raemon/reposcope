'use client';

import type { ViewerIdentity } from './viewerIdentity';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export function useViewerLogin(): string | null {
  const token = useGithubToken();
  const ready = useStoreReady();
  const { data } = useCachedJson<ViewerIdentity>(token ? '/api/github/me' : null, token, ready);
  return data?.login ?? null;
}

export function useIsOwnAuthor(): (author: string) => boolean {
  const login = useViewerLogin();
  return (author) => login !== null && author.toLowerCase() === login.toLowerCase();
}
