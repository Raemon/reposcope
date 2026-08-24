'use client';

import { useEffect, useState } from 'react';
import type { ImageSource } from './imageView';
import type { FileBlob } from './pullRequests';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';

const blobs = new Map<string, FileBlob>();
const loading = new Map<string, Promise<FileBlob>>();

export function useFileBlob(owner: string, repo: string, source: ImageSource | null) {
  const token = useGithubToken();
  const path = source ? blobPath(owner, repo, source) : null;
  return useHeldBlob(path, token);
}

function useHeldBlob(path: string | null, token: string | null) {
  const [value, setValue] = useState<FileBlob | null>(() => readHeld(path));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => watchBlob(path, token, setValue, setError), [path, token]);
  return { value, error };
}

function watchBlob(
  path: string | null,
  token: string | null,
  setValue: (blob: FileBlob | null) => void,
  setError: (error: string | null) => void,
) {
  if (!path) return;
  showHeld(path, setValue, setError);
  if (blobs.has(path)) return;
  return followBlob(path, token, setValue, setError);
}

function showHeld(
  path: string,
  setValue: (blob: FileBlob | null) => void,
  setError: (error: string | null) => void,
) {
  setValue(readHeld(path));
  setError(null);
}

function followBlob(
  path: string,
  token: string | null,
  setValue: (blob: FileBlob | null) => void,
  setError: (error: string | null) => void,
) {
  let live = true;
  loadBlob(path, token).then(
    (blob) => live && setValue(blob),
    (issue: unknown) => live && setError(errorText(issue)),
  );
  return () => {
    live = false;
  };
}

function loadBlob(path: string, token: string | null): Promise<FileBlob> {
  const cached = blobs.get(path);
  if (cached) return Promise.resolve(cached);
  return loading.get(path) ?? startBlobLoad(path, token);
}

function startBlobLoad(path: string, token: string | null): Promise<FileBlob> {
  const request = apiJson<FileBlob>(path, token).then(rememberBlob(path)).finally(() => loading.delete(path));
  loading.set(path, request);
  return request;
}

function rememberBlob(path: string) {
  return (blob: FileBlob) => {
    blobs.set(path, blob);
    return blob;
  };
}

function readHeld(path: string | null): FileBlob | null {
  return path ? (blobs.get(path) ?? null) : null;
}

function blobPath(owner: string, repo: string, source: ImageSource): string {
  return `/api/github/blob?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&ref=${encodeURIComponent(source.ref)}&path=${encodeURIComponent(source.path)}`;
}

function errorText(issue: unknown): string {
  return issue instanceof Error ? issue.message : String(issue);
}
