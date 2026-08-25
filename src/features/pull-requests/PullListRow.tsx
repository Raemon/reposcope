'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { closePull } from './closePull';
import { useColumnNav } from './columnNav';
import type { PullTarget } from './pullActionStore';
import { prefetchPull } from './prefetchPull';
import { pullRoute } from './pullPaths';
import { useGithubToken } from '@/features/sources/sourceStore';
import { rowStateClass } from '@/features/surface-ui/rowState';
import { SelectableLink } from '@/features/surface-ui/SelectableLink';

export function PullListRow({
  target,
  href,
  title,
  current,
  children,
}: {
  target: PullTarget;
  href: string;
  title: string;
  current: boolean;
  children: ReactNode;
}) {
  const token = useGithubToken();
  const row = useColumnNav('pulls').row(pullRoute(target.owner, target.repo, target.number), current);
  return (
    <div
      data-nav-cursor={row.props.cursor || undefined}
      onPointerEnter={row.props.onPointerEnter}
      className={`group flex items-baseline ${rowStateClass(row.state)}`}
    >
      <SelectableLink
        href={href}
        title={title}
        current={current}
        onPointerEnter={() => prefetchPull(target.owner, target.repo, target.number, token)}
        className="flex min-w-0 flex-1 items-baseline gap-1.5 px-2 py-[1px] text-[11px] leading-4"
      >
        {children}
      </SelectableLink>
      <ClosePullIcon target={target} token={token} shown={current} />
    </div>
  );
}

function ClosePullIcon({ target, token, shown }: { target: PullTarget; token: string | null; shown: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      title={`Close #${target.number}`}
      aria-label={`Close pull request #${target.number}`}
      onClick={() => closePull(target, token, (href) => router.push(href))}
      className={`shrink-0 px-1.5 text-[11px] leading-4 text-ink-dim hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${
        shown ? '' : 'opacity-0'
      }`}
    >
      ×
    </button>
  );
}
