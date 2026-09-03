'use client';

import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { readCachedJson, useCachedJson } from '@/features/sources/useCachedJson';

const VIEWER_PATH = '/api/github/me';

type Viewer = { login: string };

export type AuthorCheck = (author: string) => boolean;

export function useIsOwnAuthor(): AuthorCheck {
  return matchesLogin(useViewerLogin());
}

export function useOwnAuthorFilter(): AuthorCheck | null {
  return ownAuthorFilter(useViewerLogin());
}

export function cachedOwnAuthorFilter(token: string | null): AuthorCheck | null {
  return ownAuthorFilter(readCachedJson<Viewer>(VIEWER_PATH, token)?.login);
}

function ownAuthorFilter(login: string | undefined): AuthorCheck | null {
  return login ? matchesLogin(login) : null;
}

function useViewerLogin(): string | undefined {
  const token = useGithubToken();
  const ready = useStoreReady();
  return useCachedJson<Viewer>(token ? VIEWER_PATH : null, token, ready).data?.login;
}

function matchesLogin(login: string | undefined): AuthorCheck {
  return (author) => author.toLowerCase() === login?.toLowerCase();
}
