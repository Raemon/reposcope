'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Chip } from './Chip';
import { FilterField } from './FilterField';
import { searchSurface, type SurfaceGroup, type SurfaceItem } from './surfaceIndex';

export function JumpPalette({
  items,
  hrefOf,
  onSelect,
}: {
  items: SurfaceItem[];
  hrefOf: (item: SurfaceItem) => string;
  onSelect: (item: SurfaceItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const base = useId();
  const panelId = `${base}-results`;
  const rowId = (index: number) => `${base}-row-${index}`;

  const groups = useMemo(() => searchSurface(items, query), [items, query]);
  const rows = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const cursor = rows.length === 0 ? 0 : Math.min(active, rows.length - 1);
  const shown = open && query.trim() !== '';

  useEffect(() => {
    const focusField = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const summoned = event.key === 'k' && (event.metaKey || event.ctrlKey);
      const slashed = event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!summoned && !slashed) return;
      event.preventDefault();
      field.current?.focus();
      field.current?.select();
    };
    window.addEventListener('keydown', focusField);
    return () => window.removeEventListener('keydown', focusField);
  }, []);

  useEffect(() => {
    if (shown) panel.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor, shown]);

  const choose = (item: SurfaceItem) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
    field.current?.blur();
  };

  const steer = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (query === '') field.current?.blur();
      setQuery('');
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (rows.length > 0) setActive((held) => (held + (event.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length);
      return;
    }
    if (event.key !== 'Enter') return;
    const held = rows[cursor];
    if (!held) return;
    event.preventDefault();
    choose(held);
  };

  return (
    <div
      className="relative ml-auto"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <FilterField
        ref={field}
        value={query}
        onChange={(next) => {
          setQuery(next);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={steer}
        role="combobox"
        label="Jump to anything in this repository"
        expanded={shown}
        controls={shown ? panelId : undefined}
        activeRow={shown && rows.length > 0 ? rowId(cursor) : undefined}
        placeholder="jump to anything — press /"
        className="w-72"
      />
      {shown ? (
        <div
          ref={panel}
          id={panelId}
          role="listbox"
          aria-label="Jump results"
          className="absolute right-0 top-full z-40 mt-1 max-h-[60vh] w-[min(34rem,80vw)] overflow-y-auto rounded-md border border-btn-edge bg-tip py-1 shadow-[0_8px_28px_rgba(20,30,50,0.18)]"
        >
          {groups.length === 0 ? (
            <p className="px-3 py-1.5 font-mono text-[11px] text-ink-dim">nothing named that</p>
          ) : (
            groups.map((group) => (
              <JumpGroup
                key={group.viewId}
                group={group}
                rows={rows}
                cursor={cursor}
                rowId={rowId}
                hrefOf={hrefOf}
                onHover={setActive}
                onChoose={choose}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function JumpGroup({
  group,
  rows,
  cursor,
  rowId,
  hrefOf,
  onHover,
  onChoose,
}: {
  group: SurfaceGroup;
  rows: SurfaceItem[];
  cursor: number;
  rowId: (index: number) => string;
  hrefOf: (item: SurfaceItem) => string;
  onHover: (index: number) => void;
  onChoose: (item: SurfaceItem) => void;
}) {
  return (
    <div className="border-b border-btn-edge/60 py-0.5 last:border-b-0">
      <p className="px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim">{group.label}</p>
      {group.items.map((item) => {
        const index = rows.indexOf(item);
        return (
          <JumpRow
            key={`${item.viewId}:${item.label}:${item.detail}`}
            id={rowId(index)}
            item={item}
            current={index === cursor}
            href={hrefOf(item)}
            onHover={() => onHover(index)}
            onChoose={() => onChoose(item)}
          />
        );
      })}
      {group.more > 0 ? (
        <p className="px-3 py-1 font-mono text-[10px] text-ink-dim">+{group.more} more</p>
      ) : null}
    </div>
  );
}

function JumpRow({
  id,
  item,
  current,
  href,
  onHover,
  onChoose,
}: {
  id: string;
  item: SurfaceItem;
  current: boolean;
  href: string;
  onHover: () => void;
  onChoose: () => void;
}) {
  return (
    <a
      id={id}
      role="option"
      aria-selected={current}
      href={href}
      data-active={current}
      onMouseMove={onHover}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onChoose();
      }}
      className={`flex items-baseline gap-2 px-3 py-1 ${current ? 'bg-btn-active' : 'hover:bg-btn'}`}
    >
      <Chip tone={current ? 'accent' : 'dim'}>{item.kind}</Chip>
      <span className="max-w-[60%] shrink-0 truncate font-mono text-[11px] text-ink">{item.label}</span>
      <span className="min-w-0 grow truncate text-right font-mono text-[10px] text-ink-dim">{item.detail}</span>
    </a>
  );
}
