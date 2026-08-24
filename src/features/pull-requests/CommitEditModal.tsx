'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DIALOG_BUTTON } from '@/features/surface-ui/buttonStyles';

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
  const dismiss = useRef(onCancel);
  const heading = useId();
  dismiss.current = committing ? () => {} : onCancel;

  useEffect(() => {
    const restoreTo = document.activeElement as HTMLElement | null;
    panel.current?.querySelector('textarea')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss.current();
      if (event.key === 'Tab') keepFocusInside(panel.current, event);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      restoreTo?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss.current();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={heading}
        className="w-full max-w-lg rounded border border-panel-edge bg-panel p-3 shadow-card"
      >
        <h2 id={heading} className="text-[12px] text-ink">
          Make new commit?
        </h2>
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
          <button type="button" onClick={onCancel} disabled={committing} className={DIALOG_BUTTON}>
            Cancel, return to editor
          </button>
          <button type="button" onClick={onRevert} disabled={committing} className={DIALOG_BUTTON}>
            No, revert
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={committing || message.trim() === ''}
            className={`${DIALOG_BUTTON} border-accent text-accent`}
          >
            {committing ? 'Committing…' : 'Yes'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const FOCUSABLE = 'button:not(:disabled), textarea, [href], input, select, [tabindex]:not([tabindex="-1"])';

function keepFocusInside(panel: HTMLElement | null, event: KeyboardEvent) {
  const stops = panel ? [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return;
  const edge = event.shiftKey ? first : last;
  if (document.activeElement !== edge && panel?.contains(document.activeElement)) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}
