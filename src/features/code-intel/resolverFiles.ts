'use client';

import { useMemo, useRef } from 'react';
import { LIB_REF } from './codeIntelTypes';
import { once } from './once';
import type { FileListing, ResolverFiles } from '@/features/pull-requests/definitionResolver';
import { fileTextPath, repoFilesAtRefPath } from '@/features/pull-requests/pullPaths';
import type { FileText } from '@/features/pull-requests/pullRequests';
import type { RepoFileSet } from '@/features/pull-requests/repoFiles';
import { apiJson, apiText } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';

interface RefListing extends FileListing {
  names: Set<string>;
}

export function useResolverFiles(owner: string, repo: string): ResolverFiles {
  const token = useGithubToken();
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const texts = useRef(new Map<string, Promise<string | null>>());
  const listings = useRef(new Map<string, Promise<RefListing | null>>());
  return useMemo(
    () => makeResolverFiles(owner, repo, tokenRef, texts.current, listings.current),
    [owner, repo],
  );
}

interface Repo {
  owner: string;
  repo: string;
  token: { current: string | null };
}

function makeResolverFiles(
  owner: string,
  repo: string,
  token: { current: string | null },
  texts: Map<string, Promise<string | null>>,
  listings: Map<string, Promise<RefListing | null>>,
): ResolverFiles {
  const at = { owner, repo, token };
  const readFile = fileReader(at, texts);
  const listFiles = listingReader(at, listings);
  return { readFile, listFiles, hasFile: fileChecker(readFile, listFiles) };
}

type ListRef = (ref: string) => Promise<RefListing | null>;

function fileReader(at: Repo, texts: Map<string, Promise<string | null>>): ResolverFiles['readFile'] {
  return (ref, path) =>
    once(texts, `${at.owner}/${at.repo}\0${ref}\0${path}`, () => fetchText(at.owner, at.repo, ref, path, at.token.current));
}

function listingReader(at: Repo, listings: Map<string, Promise<RefListing | null>>): ListRef {
  return (ref) => {
    if (ref === LIB_REF) return Promise.resolve(null);
    return once(listings, `${at.owner}/${at.repo}\0${ref}`, () => fetchListing(at.owner, at.repo, ref, at.token.current));
  };
}

function fileChecker(readFile: ResolverFiles['readFile'], listFiles: ListRef): ResolverFiles['hasFile'] {
  return async (ref, path) => {
    if (ref === LIB_REF) return true;
    const listing = await listFiles(ref);
    if (listing?.names.has(path)) return true;
    if (listing && !listing.truncated) return false;
    return (await readFile(ref, path)) !== null;
  };
}

function fetchText(owner: string, repo: string, ref: string, path: string, token: string | null): Promise<string | null> {
  if (ref === LIB_REF) return apiText(`/typescript/${path}`);
  return apiJson<FileText>(fileTextPath(owner, repo, ref, path), token).then((got) => got.text);
}

async function fetchListing(owner: string, repo: string, ref: string, token: string | null): Promise<RefListing> {
  const got = await apiJson<RepoFileSet>(repoFilesAtRefPath(owner, repo, ref), token);
  return { names: new Set(got.files), files: got.files, truncated: got.truncated };
}
