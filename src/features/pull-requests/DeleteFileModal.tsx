'use client';

import { ACCENT_CHOICE, CHOICE } from '@/features/surface-ui/buttonStyles';
import { ModalShell } from '@/features/surface-ui/ModalShell';

export function DeleteFileModal({
  path,
  deleting,
  error,
  onConfirm,
  onCancel,
}: {
  path: string;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalShell label="Are you sure?" dismissable={!deleting} onDismiss={onCancel}>
      <p className="mt-1 text-[11px] leading-4 text-ink-dim">This commits a deletion of</p>
      <p className="filename-text mt-1 truncate text-ink">{path}</p>
      {error !== null && <p className="mt-1 text-[10px] text-error-ink">{error}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={deleting} className={CHOICE}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={deleting} className={ACCENT_CHOICE}>
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </ModalShell>
  );
}
