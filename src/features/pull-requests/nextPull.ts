'use client';

import { standingPulls, type PullTarget } from './pullActionStore';
import { listedPulls, readPullFilters, type PullFilters } from './pullFilterStore';
import { pullRoute, pullRouteFor, repoPullsPath } from './pullPaths';
import type { CrossRepoPulls, PullRequestSummary } from './pullRequests';
import { allPullsCacheKey } from './useAllPullRequests';
import { repoRoute } from '@/features/codebases/repoPaths';
import { cachedOwnAuthorFilter } from '@/features/github-auth/useViewerLogin';
import { readCachedJson } from '@/features/sources/useCachedJson';

export function viewingAcrossRepos(): boolean {
  return new URLSearchParams(window.location.search).get('from') === 'all';
}

export function viewingPull(target: PullTarget): boolean {
  return window.location.pathname === pullRoute(target.owner, target.repo, target.number);
}

export type LinkedPull = PullTarget & { href: string };

export function nextPullAfter(target: PullTarget, token: string | null, acrossRepos: boolean): LinkedPull | null {
  return neighborPull(target, token, acrossRepos, 1) ?? neighborPull(target, token, acrossRepos, -1);
}

export function neighborPull(target: PullTarget, token: string | null, acrossRepos: boolean, delta: number): LinkedPull | null {
  const { listed, index } = listedAround(target, token, acrossRepos);
  const next = index < 0 ? null : listed[index + delta] ?? null;
  return next && linked(next, acrossRepos);
}

function listedAround(target: PullTarget, token: string | null, acrossRepos: boolean): { listed: PullTarget[]; index: number } {
  const filters = readPullFilters();
  const listed = standingPulls(acrossRepos ? cachedAllPulls(token, filters) : cachedRepoPulls(target, token, filters));
  return { listed, index: listed.findIndex((pull) => samePull(pull, target)) };
}

function linked(next: PullTarget, acrossRepos: boolean): LinkedPull {
  return { ...next, href: pullRouteFor(acrossRepos)(next.owner, next.repo, next.number) };
}

export function pullListRoute(target: PullTarget, acrossRepos: boolean): string {
  return acrossRepos ? '/pulls' : repoRoute(target.owner, target.repo);
}

function cachedRepoPulls({ owner, repo }: PullTarget, token: string | null, filters: PullFilters): PullTarget[] {
  const pulls = readCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo, filters.state), token) ?? [];
  return listedPulls(pulls, filters, cachedOwnAuthorFilter(token)).map((pull) => ({ owner, repo, number: pull.number }));
}

function cachedAllPulls(token: string | null, filters: PullFilters): PullTarget[] {
  const found = readCachedJson<CrossRepoPulls>(allPullsCacheKey(filters.state), token);
  return listedPulls(found?.pulls ?? [], filters, cachedOwnAuthorFilter(token));
}

function samePull(a: PullTarget, b: PullTarget): boolean {
  return a.owner === b.owner && a.repo === b.repo && a.number === b.number;
}
