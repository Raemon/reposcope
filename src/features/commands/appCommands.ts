'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCommands, type Command } from './commandRegistry';
import { command } from './keybindings';
import { openPalette } from './paletteStore';
import { KIND_PREFIX } from './paletteQuery';
import { changeBeingRead, githubUrlBeingRead, pullTargetBeingRead, repoBeingRead, repoRoute, type PullRead } from '@/features/codebases/repoPaths';
import { closePull } from '@/features/pull-requests/closePull';
import { reloadCurrentPull, useCurrentPull } from '@/features/pull-requests/currentPullStore';
import { canMerge, mergePull } from '@/features/pull-requests/mergePull';
import { neighborPull, viewingAcrossRepos } from '@/features/pull-requests/nextPull';
import { prefetchPull } from '@/features/pull-requests/prefetchPull';
import { setPullAuthor, setPullState, useOfferedPullAuthors, usePullFilters } from '@/features/pull-requests/pullFilterStore';
import { nextViewMode, setViewMode, useViewMode, viewModeSwitchLabel } from '@/features/pull-requests/viewModeStore';
import { useGithubToken } from '@/features/sources/sourceStore';
import { nextTheme, setTheme, themeSwitchLabel, useTheme } from '@/features/theme/themeStore';

export function useAppCommands(): void {
  const pathname = usePathname();
  useCommands([
    ...paletteCommands(),
    ...useGoCommands(pathname),
    ...usePullCommands(pullTargetBeingRead(pathname)),
    ...useListCommands(),
    ...useViewCommands(changeBeingRead(pathname)),
  ]);
}

function paletteCommands(): Command[] {
  return [
    command('palette.open', 'Search everything', () => openPalette('')),
    command('palette.commands', 'Show all commands and shortcuts', () => openPalette(KIND_PREFIX.command)),
    command('palette.repos', 'Find a repository', () => openPalette(KIND_PREFIX.repo)),
    command('palette.pulls', 'Find a pull request', () => openPalette(KIND_PREFIX.pull)),
    command('palette.files', 'Find a file', () => openPalette(KIND_PREFIX.file)),
    command('palette.commits', 'Find a commit', () => openPalette(KIND_PREFIX.commit)),
    command('palette.branches', 'Find a branch', () => openPalette(KIND_PREFIX.branch)),
  ];
}

function useGoCommands(pathname: string): Command[] {
  const router = useRouter();
  const reading = repoBeingRead(pathname);
  const github = githubUrlBeingRead(pathname);
  return [
    command('go.home', 'Go home', () => router.push('/')),
    command('go.allPulls', 'Go to all pull requests', () => router.push('/pulls')),
    ...(reading ? [command('go.repo', `Go to ${reading.owner}/${reading.name} pull requests`, () => router.push(repoRoute(reading.owner, reading.name)))] : []),
    ...(github ? [command('go.github', 'Open on GitHub', () => window.open(github, '_blank', 'noopener'))] : []),
  ];
}

function usePullCommands(target: PullRead | null): Command[] {
  const router = useRouter();
  const token = useGithubToken();
  const pull = useCurrentPull(target?.owner ?? '', target?.repo ?? '', target?.number ?? 0);
  if (!target) return [];
  const step = (delta: number) => {
    const next = neighborPull(target, token, viewingAcrossRepos(), delta);
    if (!next) return;
    prefetchPull(next.owner, next.repo, next.number, token);
    router.push(next.href);
  };
  return [
    command('pull.prev', 'Previous pull request in the list', () => step(-1)),
    command('pull.next', 'Next pull request in the list', () => step(1)),
    command('pull.reload', `Reload #${target.number} from GitHub`, () => void reloadCurrentPull().catch(() => {})),
    command('pull.copyLink', 'Copy the link to this page', () => void navigator.clipboard.writeText(window.location.href)),
    ...(canMerge(pull) ? [command('pull.merge', `Merge #${target.number}`, () => mergePull(target, token, (href) => router.push(href)))] : []),
    ...(pull?.pull.state === 'open'
      ? [command('pull.close', `Close #${target.number} without merging`, () => closePull(target, token, (href) => router.push(href)))]
      : []),
  ];
}

function useListCommands(): Command[] {
  const filters = usePullFilters();
  const authors = useOfferedPullAuthors();
  const other = filters.author === 'mine' ? 'anyone' : 'mine';
  return [
    command('filter.open', 'List only open pull requests', () => setPullState('open', true)),
    command('filter.closed', 'List only closed pull requests', () => setPullState('closed', true)),
    command('filter.all', 'List open and closed pull requests', () => setPullState('all', true)),
    ...(authors.length > 1
      ? [command('filter.author', other === 'mine' ? 'List only my pull requests' : "List everyone's pull requests", () => setPullAuthor(other))]
      : []),
  ];
}

function useViewCommands(readingChange: boolean): Command[] {
  const mode = useViewMode();
  const theme = useTheme();
  return [
    ...(readingChange ? [command('view.toggle', viewModeSwitchLabel(mode), () => setViewMode(nextViewMode(mode)))] : []),
    command('theme.toggle', themeSwitchLabel(theme), () => setTheme(nextTheme(theme))),
  ];
}
