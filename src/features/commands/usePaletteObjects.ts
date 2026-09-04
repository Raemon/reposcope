'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { PaletteItem, PaletteScope } from './paletteItems';
import { commitReveal, fileReveal, requestOnPage, type RevealChannel } from './revealStore';
import { branchBeingRead, pullBeingRead, repoBeingRead, repoRoute } from '@/features/codebases/repoPaths';
import { useSidebarGroups } from '@/features/codebases/useSidebarGroups';
import type { BranchSummary } from '@/features/pull-requests/branches';
import { viewingAcrossRepos } from '@/features/pull-requests/nextPull';
import { usePullFilters } from '@/features/pull-requests/pullFilterStore';
import {
  branchFilesPath,
  branchPath,
  branchRoute,
  pullFilesPath,
  pullPath,
  pullRouteFor,
  repoBranchesPath,
  repoPullsPath,
} from '@/features/pull-requests/pullPaths';
import type { ChangedFile, ChangedFileSet, ChangeSummary, CommitSummary, PullRequestSummary } from '@/features/pull-requests/pullRequests';
import { pullStateTags } from '@/features/pull-requests/pullStateTags';
import { useRepoFiles } from '@/features/pull-requests/repoFileStore';
import { useAllPullRequests } from '@/features/pull-requests/useAllPullRequests';
import { sameRepo, type RepoRef } from '@/features/sources/parseRepoLink';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

interface Pull {
  owner: string;
  repo: string;
  number: number;
}

interface Branch {
  owner: string;
  repo: string;
  name: string;
}

interface Context {
  repo: RepoRef | null;
  pull: Pull | null;
  branch: Branch | null;
}

const SHORT_SHA = 7;
const NO_CONTEXT: Context = { repo: null, pull: null, branch: null };

export function usePaletteObjects(scope: PaletteScope | null, pathname: string, wantsFiles: boolean): PaletteItem[] {
  const context = useMemo(() => contextOf(scope, pathname), [scope, pathname]);
  const repos = useRepoItems(context.repo);
  const pulls = usePullItems(context, pathname);
  const files = useFileItems(context, wantsFiles);
  const commits = useCommitItems(context);
  const branches = useBranchItems(context.repo);
  return useMemo(() => [...repos, ...pulls, ...files, ...commits, ...branches], [repos, pulls, files, commits, branches]);
}

function contextOf(scope: PaletteScope | null, pathname: string): Context {
  if (scope?.kind === 'repo') return { repo: { owner: scope.owner, name: scope.name }, pull: null, branch: null };
  if (scope?.kind === 'pull') return { repo: { owner: scope.owner, name: scope.repo }, pull: scope, branch: null };
  if (scope?.kind === 'branch') return { repo: { owner: scope.owner, name: scope.repo }, pull: null, branch: scope };
  return contextOfPage(pathname);
}

function contextOfPage(pathname: string): Context {
  const repo = repoBeingRead(pathname);
  if (!repo) return NO_CONTEXT;
  const number = pullBeingRead(pathname);
  const branch = branchBeingRead(pathname);
  return {
    repo,
    pull: number === null ? null : { owner: repo.owner, repo: repo.name, number },
    branch: branch === null ? null : { owner: repo.owner, repo: repo.name, name: branch },
  };
}

function changeRoute(context: Context): string | null {
  if (context.pull) return pullRouteFor(viewingAcrossRepos())(context.pull.owner, context.pull.repo, context.pull.number);
  if (context.branch) return branchRoute(context.branch.owner, context.branch.repo, context.branch.name);
  return context.repo ? repoRoute(context.repo.owner, context.repo.name) : null;
}

function withParam(route: string, name: string, value: string): string {
  return `${route}${route.includes('?') ? '&' : '?'}${name}=${encodeURIComponent(value)}`;
}

function useOpenOnRoute(channel: RevealChannel, param: string): (route: string, value: string) => void {
  const router = useRouter();
  return useCallback(
    (route: string, value: string) => {
      if (!requestOnPage(channel, route, value)) router.push(withParam(route, param, value));
    },
    [router, channel, param],
  );
}

function useChangeJson<T>(context: Context, forPull: (pull: Pull) => string, forBranch: (branch: Branch) => string): T | null {
  const ready = useStoreReady();
  const token = useGithubToken();
  const path = context.pull ? forPull(context.pull) : context.branch ? forBranch(context.branch) : null;
  return useCachedJson<T>(path, token, ready).data;
}

function useRepoItems(reading: RepoRef | null): PaletteItem[] {
  const router = useRouter();
  const groups = useSidebarGroups();
  return useMemo(() => {
    const known = groups.flatMap((group) => group.repos);
    return withReadingRepo(known, reading).map((repo) => repoItem(repo, () => router.push(repoRoute(repo.owner, repo.name))));
  }, [groups, reading, router]);
}

function withReadingRepo<T extends RepoRef>(known: T[], reading: RepoRef | null): (T | (RepoRef & { description: string }))[] {
  if (!reading || known.some((repo) => sameRepo(repo, reading))) return known;
  return [{ ...reading, description: '' }, ...known];
}

function repoItem(repo: RepoRef & { description: string }, run: () => void): PaletteItem {
  return {
    key: `repo:${repo.owner}/${repo.name}`,
    kind: 'repo',
    title: `${repo.owner}/${repo.name}`,
    detail: repo.description,
    scope: { kind: 'repo', owner: repo.owner, name: repo.name },
    run,
  };
}

function usePullItems(context: Context, pathname: string): PaletteItem[] {
  const router = useRouter();
  const ready = useStoreReady();
  const token = useGithubToken();
  const { state } = usePullFilters();
  const repo = context.repo;
  const own = useCachedJson<PullRequestSummary[]>(repo ? repoPullsPath(repo.owner, repo.name, state) : null, token, ready).data;
  const across = useAllPullRequests().found;
  return useMemo(() => {
    const route = pullRouteFor(pathname === '/pulls' || viewingAcrossRepos());
    const open = (owner: string, name: string, number: number) => () => router.push(route(owner, name, number));
    const items = new Map<string, PaletteItem>();
    for (const pull of repo ? own ?? [] : []) items.set(pullKey(repo!.owner, repo!.name, pull.number), pullItem(repo!.owner, repo!.name, pull, open));
    for (const pull of across?.pulls ?? []) {
      if (!items.has(pullKey(pull.owner, pull.repo, pull.number))) items.set(pullKey(pull.owner, pull.repo, pull.number), pullItem(pull.owner, pull.repo, pull, open));
    }
    return [...items.values()];
  }, [repo, own, across, pathname, router]);
}

function pullKey(owner: string, name: string, number: number): string {
  return `pull:${owner}/${name}#${number}`;
}

function pullItem(
  owner: string,
  name: string,
  pull: PullRequestSummary,
  open: (owner: string, name: string, number: number) => () => void,
): PaletteItem {
  return {
    key: pullKey(owner, name, pull.number),
    kind: 'pull',
    title: `#${pull.number} ${pull.title}`,
    detail: [`${owner}/${name}`, pull.author, ...pullStateTags(pull)].join(' · '),
    scope: { kind: 'pull', owner, repo: name, number: pull.number, title: pull.title },
    run: open(owner, name, pull.number),
  };
}

function useFileItems(context: Context, wanted: boolean): PaletteItem[] {
  const openFile = useOpenOnRoute(fileReveal, 'file');
  const repo = context.repo;
  const tree = useRepoFiles(repo?.owner ?? '', repo?.name ?? '', wanted && repo !== null).fileSet;
  const changed = useChangeJson<ChangedFileSet>(
    context,
    (pull) => pullFilesPath(pull.owner, pull.repo, pull.number),
    (branch) => branchFilesPath(branch.owner, branch.repo, branch.name),
  );
  return useMemo(() => {
    const route = changeRoute(context);
    if (!route) return [];
    const changedItems = (changed?.files ?? []).map((file) => changedFileItem(route, file, () => openFile(route, file.filename)));
    const changedPaths = new Set(changedItems.map((item) => item.title));
    const treeItems = (tree?.files ?? []).filter((path) => !changedPaths.has(path)).map((path) => treeFileItem(route, path, () => openFile(route, path)));
    return [...changedItems, ...treeItems];
  }, [context, tree, changed, openFile]);
}

function changedFileItem(route: string, file: ChangedFile, run: () => void): PaletteItem {
  return {
    key: `changed:${route}:${file.filename}`,
    kind: 'file',
    title: file.filename,
    detail: `${file.status} · +${file.additions} −${file.deletions}`,
    run,
  };
}

function treeFileItem(route: string, path: string, run: () => void): PaletteItem {
  return { key: `file:${route}:${path}`, kind: 'file', title: path, run };
}

function useCommitItems(context: Context): PaletteItem[] {
  const openCommit = useOpenOnRoute(commitReveal, 'commit');
  const change = useChangeJson<ChangeSummary>(
    context,
    (pull) => pullPath(pull.owner, pull.repo, pull.number),
    (branch) => branchPath(branch.owner, branch.repo, branch.name),
  );
  return useMemo(() => {
    const route = changeRoute(context);
    if (!route || !change) return [];
    return change.commits.map((commit) => commitItem(route, commit, () => openCommit(route, commit.sha)));
  }, [context, change, openCommit]);
}

function commitItem(route: string, commit: CommitSummary, run: () => void): PaletteItem {
  return {
    key: `commit:${route}:${commit.sha}`,
    kind: 'commit',
    title: commit.message,
    detail: `${commit.sha.slice(0, SHORT_SHA)} · ${commit.author}`,
    run,
  };
}

function useBranchItems(repo: RepoRef | null): PaletteItem[] {
  const router = useRouter();
  const ready = useStoreReady();
  const token = useGithubToken();
  const branches = useCachedJson<BranchSummary[]>(repo ? repoBranchesPath(repo.owner, repo.name) : null, token, ready).data;
  return useMemo(() => {
    if (!repo) return [];
    return (branches ?? []).map((branch) => branchItem(repo, branch, () => router.push(branchRoute(repo.owner, repo.name, branch.name))));
  }, [repo, branches, router]);
}

function branchItem(repo: RepoRef, branch: BranchSummary, run: () => void): PaletteItem {
  return {
    key: `branch:${repo.owner}/${repo.name}:${branch.name}`,
    kind: 'branch',
    title: branch.name,
    detail: branch.pull ? `#${branch.pull.number}${branch.pull.merged ? ' merged' : ''}` : `${repo.owner}/${repo.name}`,
    scope: { kind: 'branch', owner: repo.owner, repo: repo.name, name: branch.name },
    run,
  };
}
