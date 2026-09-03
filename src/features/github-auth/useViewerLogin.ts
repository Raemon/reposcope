'use client';

import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { readCachedJson, useCachedJson } from '@/features/sources/useCachedJson';

const VIEWER_PATH = '/api/github/me';

export type AuthorCheck = (author: string) => boolean;

export function useIsOwnAuthor(): AuthorCheck {
  const token = useGithubToken();
  const ready = useStoreReady();
  const { data } = useCachedJson<{ login: string }>(token ? VIEWER_PATH : null, token, ready);
  return matchesLogin(data?.login);
}

export function useOwnAuthorFilter(): AuthorCheck | null {
  const token = useGithubToken();
  const isOwnAuthor = useIsOwnAuthor();
  return token ? isOwnAuthor : null;
}

export function ownAuthorFilter(token: string | null): AuthorCheck | null {
  return token ? matchesLogin(readCachedJson<{ login: string }>(VIEWER_PATH, token)?.login) : null;
}

function matchesLogin(login: string | undefined): AuthorCheck {
  return (author) => author.toLowerCase() === login?.toLowerCase();
}
