'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { closePull } from './closePull';
import { NavListRow } from './NavListRow';
import type { PullTarget } from './pullActionStore';
import { prefetchPull } from './prefetchPull';
import { pullRoute } from './pullPaths';
import { useGithubToken } from '@/features/sources/sourceStore';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';

export function PullListRow({
  target,
  href,
  current,
  children,
}: {
  target: PullTarget;
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  const token = useGithubToken();
  return (
    <NavListRow
      route={pullRoute(target.owner, target.repo, target.number)}
      href={href}
      current={current}
      onPointerEnter={() => prefetchPull(target.owner, target.repo, target.number, token)}
      trailing={<ClosePullIcon target={target} token={token} shown={current} />}
    >
      {children}
    </NavListRow>
  );
}

function ClosePullIcon({ target, token, shown }: { target: PullTarget; token: string | null; shown: boolean }) {
  const router = useRouter();
  return (
    <HoverCardTrigger label={`Close #${target.number}`} className={`shrink-0 focus-within:opacity-100 group-hover:opacity-100 ${shown ? '' : 'opacity-0'}`} focusable={false} tooltipStyle>
      <button
        type="button"
        aria-label={`Close pull request #${target.number}`}
        onClick={() => closePull(target, token, (href) => router.push(href))}
        className="px-1.5 text-[11px] leading-4 text-ink-dim hover:text-ink"
      >
        ×
      </button>
    </HoverCardTrigger>
  );
}
