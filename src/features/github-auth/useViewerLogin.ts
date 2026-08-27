'use client';

import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

export function useIsOwnAuthor(): (author: string) => boolean {
  const token = useGithubToken();
  const ready = useStoreReady();
  const { data } = useCachedJson<{ login: string }>(token ? '/api/github/me' : null, token, ready);
  return (author) => author.toLowerCase() === data?.login.toLowerCase();
}
