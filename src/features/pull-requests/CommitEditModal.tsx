'use client';

import { useEffect, useRef } from 'react';

const BUTTON =
  'rounded border border-btn-edge bg-btn px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink disabled:opacity-40';

export function CommitEditModal({
  path,
  message,
  committing,
  error,
  onMessage,
  onCommit,
  onRevert,
  onCancel,
}: {
  path: string;
  message: string;
  committing: boolean;
  error: string | null;
  onMessage: (next: string) => void;
  onCommit: () => void;
  onRevert: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    panel.current?.querySelector('textarea')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Make new commit?"
        className="w-full max-w-lg rounded border border-panel-edge bg-panel p-3 shadow-card"
      >
        <h2 className="text-[12px] text-ink">Make new commit?</h2>
        <p className="mt-1 truncate text-[10px] text-ink-dim">{path}</p>
        <textarea
          value={message}
          rows={3}
          aria-label="Commit message"
          onChange={(event) => onMessage(event.target.value)}
          className="mt-2 w-full resize-y rounded border border-btn-edge bg-field p-1.5 font-mono text-[11px] leading-4 text-ink outline-none focus:border-accent"
        />
        {error !== null && <p className="mt-1 text-[10px] text-error-ink">{error}</p>}
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={committing} className={BUTTON}>
            Cancel, return to editor
          </button>
          <button type="button" onClick={onRevert} disabled={committing} className={BUTTON}>
            No, revert
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={committing || message.trim() === ''}
            className={`${BUTTON} border-accent text-accent`}
          >
            {committing ? 'Committing…' : 'Yes'}
          </button>
        </div>
      </div>
    </div>
  );
}
