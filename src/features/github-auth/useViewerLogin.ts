'use client';

import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { readCachedJson, useCachedJson } from '@/features/sources/useCachedJson';

const VIEWER_PATH = '/api/github/me';

export function useIsOwnAuthor(): (author: string) => boolean {
  const token = useGithubToken();
  const ready = useStoreReady();
  const { data } = useCachedJson<{ login: string }>(token ? VIEWER_PATH : null, token, ready);
  return authorCheck(data?.login);
}

export function ownAuthorCheck(token: string | null): (author: string) => boolean {
  return authorCheck(readCachedJson<{ login: string }>(VIEWER_PATH, token)?.login);
}

function authorCheck(login: string | undefined): (author: string) => boolean {
  return (author) => author.toLowerCase() === login?.toLowerCase();
}
