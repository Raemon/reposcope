'use client';

import { useEffect, useState } from 'react';
import type { ImageSource } from './imageView';
import type { FileBlob } from './pullRequests';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';

export function useFileBlob(owner: string, repo: string, source: ImageSource | null) {
  const token = useGithubToken();
  const [value, setValue] = useState<FileBlob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = source?.ref ?? null;
  const path = source?.path ?? null;

  useEffect(() => {
    if (!ref || !path) return;
    const controller = new AbortController();
    setValue(null);
    setError(null);
    apiJson<FileBlob>(
      `/api/github/blob?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`,
      token,
      controller.signal,
    )
      .then(setValue)
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [owner, repo, ref, path, token]);

  return { value, error };
}
