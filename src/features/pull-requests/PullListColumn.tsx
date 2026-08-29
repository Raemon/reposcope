'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AllPullRequestList } from './AllPullRequestList';
import { BranchesSection, useBranches } from './BranchesSection';
import { useShowsColumn } from './centralLayout';
import { ColumnPreview, type PreviewToken } from './ColumnPreview';
import { useRegisterColumn } from './columnNav';
import { PullFilterMenu } from './PullFilterMenu';
import { PullRequestList } from './PullRequestList';
import { collapsePullListOnSelect, type PullListColumnName } from './pullListColumn';
import { ResizableColumn, type ColumnSize } from './ResizableColumn';
import { branchRoute, allPullsRoute, pullRoute } from './pullPaths';
import type { PullRequestSummary } from './pullRequests';
import type { BranchSummary } from './branches';
import { useStickyOpen } from './stickyColumns';
import { useAllPullList, useRepoPullList } from './usePullLists';

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
  pull: boolean;
}

export function RepoPullsColumn({ owner, repo, size, onSize }: PullColumn) {
  const { listed } = useRepoPullList(owner, repo);
  const [branchesOpen, setBranchesOpen] = useStickyOpen('branches');
  const listingBranches = size.open && branchesOpen;
  const branches = useBranches(owner, repo, listingBranches);
  return (
    <PullsColumn
      column="pulls"
      targets={repoTargets(owner, repo, listed, listingBranches ? branches : [])}
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
  const { listed } = useAllPullList();
  return (
    <PullsColumn column="all-pulls" targets={listed.map((pull) => pullTarget(pull.owner, pull.repo, pull, true))} size={size} onSize={onSize}>
      <AllPullRequestList />
    </PullsColumn>
  );
}

function PullsColumn({
  column,
  targets,
  size,
  onSize,
  footer,
  children,
}: {
  column: PullListColumnName;
  targets: PullNavTarget[];
  size: ColumnSize;
  onSize: (next: ColumnSize) => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const selected = targets.some((target) => target.route === pathname) ? pathname : null;
  useRegisterColumn(
    'pulls',
    {
      items: targets.map((target) => target.route),
      selected,
      open: size.open,
      collapsible: true,
      setOpen: (open) => onSize({ ...size, open }),
      onActivate: (route) => selectTarget(router, targets, route, column),
    },
    useShowsColumn('pulls'),
  );
  return (
    <ResizableColumn
      navId="pulls"
      icon={ICON}
      title="pull requests"
      preview={<ColumnPreview column="pulls" tokens={targets.map((target) => pullToken(target, target.route === selected))} />}
      size={size}
      onSize={onSize}
      action={<PullFilterMenu />}
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
    pull: true,
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
  return { route, href: route, label: leaf.slice(0, 2), title: `${owner}/${repo} · ${branch.name}`, pull: false };
}

function pullToken(target: PullNavTarget, accent: boolean): PreviewToken {
  return { key: target.route, label: target.label, title: target.title, accent };
}

function selectTarget(
  router: { push: (href: string) => void },
  targets: PullNavTarget[],
  route: string,
  column: PullListColumnName,
) {
  const target = targets.find((held) => held.route === route);
  if (!target) return;
  router.push(target.href);
  if (target.pull) collapsePullListOnSelect(column);
}
