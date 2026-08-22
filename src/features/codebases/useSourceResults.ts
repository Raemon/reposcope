'use client';

import { useEffect, useRef, useState } from 'react';
import type { RepoSummary, ViewerRepos } from './repoDirectory';
import { reposResult, sourceResultKey, viewerResult, type SourceResult } from './sidebarGroups';
import { apiJson } from '@/features/sources/apiClient';
import type { CodebaseSource } from '@/features/sources/sourceTypes';

const NONE = new Map<string, SourceResult>();

export function useSourceResults(
  sources: CodebaseSource[],
  token: string | null,
  ready: boolean,
): Map<string, SourceResult> {
  const [results, setResults] = useState({ token, map: NONE });
  const pending = useRef(new Map<string, Promise<SourceResult>>());

  useEffect(() => {
    if (!ready) return;
    let live = true;
    for (const source of sources) {
      const key = sourceResultKey(source);
      const cacheKey = `${token ?? ''} ${key}`;
      let request = pending.current.get(cacheKey);
      if (!request) {
        request = fetchSource(source, token).catch(
          (error: unknown): SourceResult => ({
            state: 'error',
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        pending.current.set(cacheKey, request);
      }
      void request.then((result) => {
        if (!live) return;
        setResults((held) => {
          const map = held.token === token ? held.map : NONE;
          return map.get(key) === result ? held : { token, map: new Map(map).set(key, result) };
        });
      });
    }
    return () => {
      live = false;
    };
  }, [sources, token, ready]);

  return results.token === token ? results.map : NONE;
}

function fetchSource(source: CodebaseSource, token: string | null): Promise<SourceResult> {
  switch (source.kind) {
    case 'owner':
      return apiJson<RepoSummary[]>(`/api/github/repos?owner=${encodeURIComponent(source.login)}`, token).then(
        reposResult,
      );
    case 'repo':
      return apiJson<RepoSummary>(
        `/api/github/repo?owner=${encodeURIComponent(source.owner)}&name=${encodeURIComponent(source.name)}`,
        token,
      ).then((repo) => reposResult([repo]));
    case 'viewer':
      return apiJson<ViewerRepos>('/api/github/viewer', token).then(viewerResult);
  }
}
