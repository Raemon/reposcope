'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AllPullRequestList } from './AllPullRequestList';
import { BranchesSection, useBranches } from './BranchesSection';
import { ColumnPreview, type PreviewToken } from './ColumnPreview';
import { useRegisterColumn } from './columnNav';
import { PullRequestList } from './PullRequestMenu';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { useStandingPulls, useStandingRepoPulls } from './pullActionStore';
import { branchRoute, allPullsRoute, pullRoute, repoPullsPath } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';
import type { BranchSummary } from './branches';
import { useStickyOpen } from './stickyColumns';
import { useAllPullRequests } from './useAllPullRequests';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';

const ICON = '⇅';

export interface PullColumn {
  owner: string;
  repo: string;
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
}

interface PullNavTarget {
  route: string;
  href: string;
  label: string;
  title: string;
}

export function RepoPullsColumn({ owner, repo, size, onSize }: PullColumn) {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data: pulls } = useCachedJson<PullRequestSummary[]>(repoPullsPath(owner, repo), token, ready);
  const standingPulls = useStandingRepoPulls(owner, repo, pulls);
  const [branchesOpen, setBranchesOpen] = useStickyOpen('branches');
  const listingBranches = size.open && branchesOpen;
  const branches = useBranches(owner, repo, listingBranches);
  return (
    <PullsColumn
      targets={repoTargets(owner, repo, standingPulls, listingBranches ? branches : [])}
      size={size}
      onSize={onSize}
      footer={
        <BranchesSection owner={owner} repo={repo} branches={branches} expanded={branchesOpen} onExpanded={setBranchesOpen} />
      }
    >
      <PullRequestList repo={{ owner, name: repo }} />
    </PullsColumn>
  );
}

export function AllPullsColumn({ size, onSize }: Pick<PullColumn, 'size' | 'onSize'>) {
  const { found } = useAllPullRequests();
  const standingPulls = useStandingPulls(found?.pulls);
  return (
    <PullsColumn targets={standingPulls.map((pull) => pullTarget(pull.owner, pull.repo, pull, true))} size={size} onSize={onSize}>
      <AllPullRequestList />
    </PullsColumn>
  );
}

function PullsColumn({
  targets,
  size,
  onSize,
  footer,
  children,
}: {
  targets: PullNavTarget[];
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const selected = targets.some((target) => target.route === pathname) ? pathname : null;
  useRegisterColumn('pulls', {
    items: targets.map((target) => target.route),
    selected,
    open: size.open,
    collapsible: true,
    setOpen: (open) => onSize({ ...size, open }),
    onActivate: (route) => visitTarget(router, targets, route),
  });
  return (
    <ResizableColumn
      navId="pulls"
      icon={ICON}
      title="pull requests"
      preview={<ColumnPreview column="pulls" tokens={targets.map((target) => pullToken(target, target.route === selected))} />}
      size={size}
      onSize={onSize}
      footer={footer}
    >
      {children}
    </ResizableColumn>
  );
}

function pullTarget(owner: string, repo: string, pull: PullRequestSummary, acrossRepos: boolean): PullNavTarget {
  const route = pullRoute(owner, repo, pull.number);
  return {
    route,
    href: acrossRepos ? allPullsRoute(owner, repo, pull.number) : route,
    label: String(pull.number).slice(-2),
    title: `${owner}/${repo} #${pull.number} · ${pull.title}`,
  };
}

function repoTargets(owner: string, repo: string, pulls: PullRequestSummary[], branches: BranchSummary[]): PullNavTarget[] {
  return [
    ...pulls.map((pull) => pullTarget(owner, repo, pull, false)),
    ...branches.map((branch) => branchTarget(owner, repo, branch)),
  ];
}

function branchTarget(owner: string, repo: string, branch: BranchSummary): PullNavTarget {
  const route = branchRoute(owner, repo, branch.name);
  const leaf = branch.name.split('/').pop() ?? branch.name;
  return { route, href: route, label: leaf.slice(0, 2), title: `${owner}/${repo} · ${branch.name}` };
}

function pullToken(target: PullNavTarget, accent: boolean): PreviewToken {
  return { key: target.route, label: target.label, title: target.title, accent };
}

function visitTarget(router: { push: (href: string) => void }, targets: PullNavTarget[], route: string) {
  const target = targets.find((held) => held.route === route);
  if (target) router.push(target.href);
}
