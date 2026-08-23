'use client';

import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import type { SurfaceView, SurfaceViewId } from './surfaceViews';

export function ViewSwitcher({
  views,
  active,
  viewHref,
  onSelect,
}: {
  views: SurfaceView[];
  active: SurfaceViewId;
  viewHref: (id: SurfaceViewId) => string;
  onSelect: (id: SurfaceViewId) => void;
}) {
  return (
    <nav aria-label="Codebase views" className="mb-5 flex flex-wrap gap-1.5 border-b border-panel-edge pb-3">
      {views.map((view) => (
        <HoverCardTrigger
          key={view.id}
          label={view.label}
          placement="below"
          interactive={false}
          card={
            <p className="max-w-72 text-[11px] leading-4 text-ink">
              {view.available ? view.hint : view.reason}
            </p>
          }
        >
          <ViewTab view={view} current={view.id === active} href={viewHref(view.id)} onSelect={onSelect} />
        </HoverCardTrigger>
      ))}
    </nav>
  );
}

function ViewTab({
  view,
  current,
  href,
  onSelect,
}: {
  view: SurfaceView;
  current: boolean;
  href: string;
  onSelect: (id: SurfaceViewId) => void;
}) {
  const className = `flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] transition-colors ${
    current
      ? 'border-accent bg-panel text-accent'
      : view.available
        ? 'border-btn-edge bg-btn text-ink-dim hover:bg-btn-hover hover:text-ink'
        : 'cursor-not-allowed border-btn-edge bg-bg text-ink-dim opacity-50'
  }`;
  const label = (
    <>
      {view.label}
      {view.count !== null && view.count > 0 ? (
        <span className={`rounded-sm px-1 font-mono text-[10px] leading-4 ${current ? 'bg-procgen text-accent' : 'bg-procgen text-ink-dim'}`}>
          {view.count}
        </span>
      ) : null}
    </>
  );

  if (!view.available) {
    return (
      <button type="button" disabled className={className}>
        {label}
      </button>
    );
  }
  return (
    <a
      href={href}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onSelect(view.id);
      }}
      className={className}
    >
      {label}
    </a>
  );
}
