'use client';

import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import type { SurfaceView, SurfaceViewId } from './surfaceViews';

export function ViewSwitcher({
  views,
  active,
  onSelect,
}: {
  views: SurfaceView[];
  active: SurfaceViewId;
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
          <button
            type="button"
            aria-pressed={view.id === active}
            disabled={!view.available}
            onClick={() => onSelect(view.id)}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] transition-colors ${
              view.id === active
                ? 'border-accent bg-panel text-accent'
                : view.available
                  ? 'border-btn-edge bg-btn text-ink-dim hover:bg-btn-hover hover:text-ink'
                  : 'cursor-not-allowed border-btn-edge bg-bg text-ink-dim opacity-50'
            }`}
          >
            {view.label}
            {view.count !== null && view.count > 0 ? (
              <span className={`rounded-sm px-1 font-mono text-[10px] leading-4 ${view.id === active ? 'bg-procgen text-accent' : 'bg-procgen text-ink-dim'}`}>
                {view.count}
              </span>
            ) : null}
          </button>
        </HoverCardTrigger>
      ))}
    </nav>
  );
}
