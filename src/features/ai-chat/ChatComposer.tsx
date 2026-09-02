'use client';

import { useState } from 'react';
import type { CursorModel } from './cursorTypes';
import { SMALL_CHOICE } from '@/features/surface-ui/buttonStyles';
import { FIELD_FOCUS, PROSE_FIELD } from '@/features/surface-ui/fieldStyles';

export function ChatComposer({
  busy,
  disabled,
  models,
  model,
  onModel,
  onSend,
}: {
  busy: boolean;
  disabled: boolean;
  models: CursorModel[];
  model: string | null;
  onModel: (id: string) => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const send = () => {
    if (!draft.trim() || disabled) return;
    onSend(draft.trim());
    setDraft('');
  };
  return (
    <div className="shrink-0 border-t border-panel-edge bg-panel px-1.5 py-1">
      <textarea
        rows={3}
        value={draft}
        disabled={disabled}
        placeholder={busy ? 'Queue the next instruction…' : 'Ask the cloud agent to change this branch…'}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && (event.metaKey || event.ctrlKey) && send()}
        className={`${PROSE_FIELD} resize-y`}
      />
      <div className="mt-0.5 flex items-center gap-1">
        <ModelSelect models={models} model={model} onModel={onModel} />
        <span className="ml-auto shrink-0 text-[9px] tracking-[0.14em] text-ink-dim">⌘↩</span>
        <button type="button" onClick={send} disabled={disabled || !draft.trim()} className={SMALL_CHOICE}>
          send
        </button>
      </div>
    </div>
  );
}

function ModelSelect({ models, model, onModel }: { models: CursorModel[]; model: string | null; onModel: (id: string) => void }) {
  if (models.length === 0) return null;
  return (
    <select
      aria-label="Model"
      value={model ?? ''}
      onChange={(event) => onModel(event.target.value)}
      className={`${FIELD_FOCUS} min-w-0 max-w-[60%] truncate rounded bg-btn px-1 py-[2px] font-mono text-[9px] text-ink-dim hover:text-ink`}
    >
      {models.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {entry.displayName}
        </option>
      ))}
    </select>
  );
}
