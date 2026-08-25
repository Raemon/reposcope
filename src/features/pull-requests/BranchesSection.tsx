'use client';

import { usePathname } from 'next/navigation';
import type { BranchSummary } from './branches';
import { useColumnNav } from './columnNav';
import { branchRoute, repoBranchesPath } from './pullPaths';
import { SECTION_HEADER_LABEL, SECTION_HEADER_ROW } from './ResizableColumn';
import { useGithubToken, useStoreReady } from '@/features/sources/sourceStore';
import { useCachedJson } from '@/features/sources/useCachedJson';
import { RelativeTime } from '@/features/surface-ui/RelativeTime';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';
import { SelectableRow } from '@/features/surface-ui/SelectableRow';

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
      <SelectableRow
        onActivate={() => onExpanded(!expanded)}
        expanded={expanded}
        label={`${expanded ? 'Collapse' : 'Expand'} branches`}
        className={`${SECTION_HEADER_ROW} bg-panel hover:bg-btn-hover`}
      >
        <span aria-hidden className="shrink-0 text-[11px] leading-4 text-ink-dim">⑂</span>
        <span className={`${SECTION_HEADER_LABEL} text-ink-dim`}>branches</span>
        <span aria-hidden className="ml-auto shrink-0 px-1 text-[11px] leading-none text-ink-dim">{expanded ? '⌄' : '⌃'}</span>
      </SelectableRow>
      {expanded && <BranchList owner={owner} repo={repo} branches={branches} />}
    </section>
  );
}

function BranchList({ owner, repo, branches }: { owner: string; repo: string; branches: BranchSummary[] }) {
  const pathname = usePathname();
  if (branches.length === 0) return <p className="px-2 py-1 text-[11px] leading-4 text-ink-dim">No branches.</p>;
  return (
    <nav className="min-h-0 flex-1 overflow-auto py-[1px]">
      {branches.map((branch) => (
        <BranchRow
          key={branch.name}
          branch={branch}
          href={branchRoute(owner, repo, branch.name)}
          current={pathname === branchRoute(owner, repo, branch.name)}
        />
      ))}
    </nav>
  );
}

function BranchRow({ branch, href, current }: { branch: BranchSummary; href: string; current: boolean }) {
  const row = useColumnNav('pulls').row(href, current);
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`flex items-baseline ${rowStateClass(row.state)} ${branch.mergedAndUnchanged ? 'opacity-50' : ''}`}
    >
      <SelectableLink
        href={href}
        current={current}
        className="flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4"
      >
        <span className="min-w-0 flex-1 truncate">{branch.name}</span>
        {branch.pull && <span className="shrink-0 text-[9px] text-ink-dim">#{branch.pull.number}</span>}
        <RelativeTime iso={branch.updatedAt} className="shrink-0 text-[9px] text-ink-dim" />
      </SelectableLink>
    </div>
  );
}
