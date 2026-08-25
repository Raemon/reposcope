'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { repoRoute } from './repoPaths';
import type { SidebarGroup } from './sidebarGroups';
import { removeSource } from '@/features/sources/sourceStore';
import type { CodebaseSource } from '@/features/sources/sourceTypes';
import { FilterField } from '@/features/surface-ui/FilterField';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

export function CodebaseList({ groups }: { groups: SidebarGroup[] }) {
  const [filter, setFilter] = useState('');
  const pathname = usePathname();
  const shown = useMemo(() => filterGroups(groups, filter), [groups, filter]);
  const active = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    active.current?.scrollIntoView({ block: 'center' });
  }, [pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-panel-edge px-2 py-2">
        <FilterField
          value={filter}
          onChange={setFilter}
          placeholder="filter repositories"
          aria-label="Filter repositories"
          className="w-full"
        />
      </div>
      <nav className="min-h-0 flex-1 overflow-auto py-1">
        {shown.map((group) => (
          <section key={group.owner}>
            <h2 className="sticky top-0 z-10 flex items-baseline gap-1.5 bg-panel px-3 pb-1 pt-2 text-[9px] uppercase tracking-[0.18em] text-ink-dim">
              <span className="truncate">
                {group.owner} · {group.loading ? '…' : group.repos.length}
              </span>
              {group.you && <span className="rounded bg-btn px-1 normal-case tracking-normal">you</span>}
              {group.source && <RemoveControl source={group.source} label={`Remove ${group.owner}`} />}
            </h2>
            {group.error && (
              <p className="mx-3 mb-1 rounded bg-error-bg px-2 py-1 text-[10px] leading-4 text-error-ink">
                {group.error}
              </p>
            )}
            {group.repos.map((repo) => {
              const href = repoRoute(repo.owner, repo.name);
              const activeLink = pathname === href;
              return (
                <div
                  key={href}
                  className={`flex items-baseline gap-1.5 pr-2 ${activeLink ? 'bg-btn-active' : 'hover:bg-btn-hover'}`}
                >
                  <HoverCardTrigger label={repo.description} className="min-w-0 flex-1" focusable={false} tooltipStyle>
                    <SelectableLink
                      ref={activeLink ? active : undefined}
                      href={href}
                      current={activeLink}
                      className={`flex min-w-0 flex-1 items-baseline justify-between gap-2 py-[3px] pl-3 text-[11px] leading-4 ${
                        activeLink ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      <span className="truncate">{repo.name}</span>
                      <span className="shrink-0 text-[9px] text-ink-dim">
                        {repo.private && <span className="mr-1 rounded bg-btn px-1">private</span>}
                        {repo.language}
                      </span>
                    </SelectableLink>
                  </HoverCardTrigger>
                  {repo.source && <RemoveControl source={repo.source} label={`Remove ${repo.owner}/${repo.name}`} />}
                </div>
              );
            })}
          </section>
        ))}
      </nav>
    </div>
  );
}

function RemoveControl({ source, label }: { source: CodebaseSource; label: string }) {
  return (
    <HoverCardTrigger label={label} className="ml-auto shrink-0" focusable={false} tooltipStyle>
      <button
        type="button"
        aria-label={label}
        onClick={() => removeSource(source)}
        className="px-1 text-[11px] leading-none text-ink-dim hover:text-error-ink"
      >
        ×
      </button>
    </HoverCardTrigger>
  );
}

function filterGroups(groups: SidebarGroup[], filter: string): SidebarGroup[] {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return groups;
  return groups
    .map((group) => ({
      ...group,
      repos: group.repos.filter((repo) =>
        `${repo.owner}/${repo.name} ${repo.description}`.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.repos.length > 0 || group.error !== null || group.loading);
}
