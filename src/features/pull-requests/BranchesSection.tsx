'use client';

import { usePathname } from 'next/navigation';
import type { BranchSummary } from './branches';
import { NavListRow } from './NavListRow';
import { branchRoute, repoBranchesPath } from './pullPaths';
import { SectionHeader } from './ResizableColumn';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';

export function useBranches(owner: string, repo: string, wanted: boolean): BranchSummary[] {
  const ready = useStoreReady();
  const token = useGithubToken();
  const { data } = useCachedJson<BranchSummary[]>(wanted ? repoBranchesPath(owner, repo) : null, token, ready);
  return data ?? [];
}

export function BranchesSection({
  owner,
  repo,
  branches,
  expanded,
  onExpanded,
}: {
  owner: string;
  repo: string;
  branches: BranchSummary[];
  expanded: boolean;
  onExpanded: (next: boolean) => void;
}) {
  return (
    <section className={`flex shrink-0 flex-col border-t border-panel-edge ${expanded ? 'h-1/2 min-h-0' : ''}`}>
      <SectionHeader
        icon="⑂"
        title="branches"
        titleTone="text-ink-dim"
        chevron={expanded ? '⌄' : '⌃'}
        tone="bg-panel hover:bg-btn-hover"
        label={`${expanded ? 'Collapse' : 'Expand'} branches`}
        expanded={expanded}
        onActivate={() => onExpanded(!expanded)}
      />
      {expanded && <BranchList owner={owner} repo={repo} branches={branches} />}
    </section>
  );
}

function BranchList({ owner, repo, branches }: { owner: string; repo: string; branches: BranchSummary[] }) {
  const pathname = usePathname();
  if (branches.length === 0) return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">No branches.</p>;
  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {branches.map((branch) => {
        const href = branchRoute(owner, repo, branch.name);
        return <BranchRow key={branch.name} branch={branch} href={href} current={pathname === href} />;
      })}
    </nav>
  );
}

function BranchRow({ branch, href, current }: { branch: BranchSummary; href: string; current: boolean }) {
  return (
    <NavListRow route={href} href={href} current={current} dimmed={branch.mergedAndUnchanged}>
      <span className="min-w-0 flex-1 truncate">{branch.name}</span>
      {branch.pull && <span className="shrink-0 text-[9px] text-ink-dim">#{branch.pull.number}</span>}
      <RelativeTime iso={branch.updatedAt} className="shrink-0 text-[9px] text-ink-dim" />
    </NavListRow>
  );
}
