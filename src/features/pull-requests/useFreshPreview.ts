'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FreshPreviewBranch } from './freshPreviewBranch';
import { freshPreviewPath, previewForRefPath } from './pullPaths';
import { apiJson, apiPost } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken } from '@/features/sources/sourceStore';

const POLL_MS = 15_000;
const MAX_POLLS = 20;

export interface FreshPreview {
  url: string | null;
  branch: string | null;
  creating: boolean;
  building: boolean;
  failure: string | null;
  start: () => void;
}

export function useFreshPreview(repo: RepoRef, number: number): FreshPreview {
  const token = useGithubToken();
  const [branch, setBranch] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const giveUp = useCallback((message: string) => {
    setBranch(null);
    setFailure(message);
  }, []);

  useDeployedPreview({ repo, branch, url, token, onFound: setUrl, onGiveUp: giveUp });

  function start(): void {
    setFailure(null);
    setUrl(null);
    setBranch(null);
    setCreating(true);
    apiPost<FreshPreviewBranch>(freshPreviewPath(repo.owner, repo.name, number), token)
      .then((made) => setBranch(made.branch))
      .catch((issue: unknown) => setFailure(`preview refused: ${errorMessage(issue)}`))
      .finally(() => setCreating(false));
  }

  return { url, branch, creating, building: branch !== null && url === null, failure, start };
}

interface PreviewWatch {
  repo: RepoRef;
  branch: string | null;
  url: string | null;
  token: string | null;
  onFound: (url: string) => void;
  onGiveUp: (message: string) => void;
}

function useDeployedPreview({ repo, branch, url, token, onFound, onGiveUp }: PreviewWatch): void {
  useEffect(() => {
    if (branch === null || url !== null) return;
    let live = true;
    let polls = 0;
    const ask = () =>
      apiJson<{ url: string | null }>(previewForRefPath(repo.owner, repo.name, branch), token)
        .then((found) => {
          if (live && found.url !== null) onFound(found.url);
        })
        .catch((issue: unknown) => onGiveUp(`${branch} could not be checked: ${errorMessage(issue)}`));
    const timer = setInterval(() => {
      polls += 1;
      void (polls > MAX_POLLS ? onGiveUp(`${branch} has not deployed a preview yet`) : ask());
    }, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [repo.owner, repo.name, branch, url, token, onFound, onGiveUp]);
}
