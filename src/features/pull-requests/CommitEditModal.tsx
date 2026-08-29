'use client';

import { CHOICE } from '@/features/surface-ui/buttonStyles';
import { ModalShell } from '@/features/surface-ui/ModalShell';

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
  return (
    <ModalShell label="Make new commit?" dismissable={!committing} onDismiss={onCancel}>
      <p className="filename-text mt-1 truncate text-ink-dim">{path}</p>
      <textarea
        value={message}
        rows={3}
        aria-label="Commit message"
        onChange={(event) => onMessage(event.target.value)}
        className="mt-2 w-full resize-y rounded bg-field p-1.5 font-mono text-[11px] leading-4 text-ink outline-none focus:ring-1 focus:ring-accent"
      />
      {error !== null && <p className="mt-1 text-[10px] text-error-ink">{error}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={committing} className={CHOICE}>
          Cancel, return to editor
        </button>
        <button type="button" onClick={onRevert} disabled={committing} className={CHOICE}>
          No, revert
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={committing || message.trim() === ''}
          className={`${CHOICE} text-accent`}
        >
          {committing ? 'Committing…' : 'Yes'}
        </button>
      </div>
    </ModalShell>
  );
}
