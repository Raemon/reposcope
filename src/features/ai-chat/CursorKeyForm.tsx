'use client';

import { useState } from 'react';
import { writeCursorKey } from './cursorKeyStore';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

export function CursorKeyForm({ error }: { error: string | null }) {
  const [draft, setDraft] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.trim()) writeCursorKey(draft.trim());
      }}
      className="flex flex-col gap-1.5 px-1.5 py-2"
    >
      <p className="text-[11px] leading-4 text-ink-dim">
        Paste a Cursor API key to run cloud agents on this repository. The key is kept in this browser and sent only to Cursor.
      </p>
      <input
        type="password"
        value={draft}
        autoComplete="off"
        placeholder="key_…"
        onChange={(event) => setDraft(event.target.value)}
        className="w-full rounded bg-field px-1.5 py-1 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {error !== null && <p className="text-[10px] leading-4 text-error-ink">{error}</p>}
      <div className="flex items-center gap-1">
        <a
          href="https://cursor.com/dashboard?tab=integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-ink-dim underline hover:text-ink"
        >
          create a key
        </a>
        <button type="submit" disabled={!draft.trim()} className={`${BUTTON} ml-auto px-1.5 py-[2px] text-[9px]`}>
          save key
        </button>
      </div>
    </form>
  );
}
