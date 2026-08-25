'use client';

import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { pullThreadsPath } from './pullPaths';
import type { ReviewThread } from './reviewThreads';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { usePollWhileVisible } from '@/features/sources/usePollWhileVisible';

export interface ReviewThreadTarget {
  owner: string;
  repo: string;
  number: number | null;
  threads: ReviewThread[];
  reload: () => Promise<unknown>;
}

const ReviewThreadContext = createContext<ReviewThreadTarget | null>(null);

export function ReviewThreadProvider({
  owner,
  repo,
  number,
  children,
}: {
  owner: string;
  repo: string;
  number: number | null;
  children: ReactNode;
}) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data, reload } = useCachedJson<ReviewThread[]>(number === null ? null : pullThreadsPath(owner, repo, number), token, ready);
  const latestReload = useRef(reload);
  latestReload.current = reload;

  usePollWhileVisible(reload, ready);

  const target = useMemo(
    () => ({
      owner,
      repo,
      number,
      threads: data ?? [],
      reload: () => latestReload.current(),
    }),
    [owner, repo, number, data],
  );
  return <ReviewThreadContext value={target}>{children}</ReviewThreadContext>;
}

export function useReviewTarget(): ReviewThreadTarget {
  const target = useContext(ReviewThreadContext);
  if (target === null) throw new Error('Review threads are only available inside a pull request');
  return target;
}

export function useFileThreads(path: string): ReviewThread[] {
  const { threads } = useReviewTarget();
  return useMemo(() => threads.filter((thread) => thread.path === path), [threads, path]);
}
