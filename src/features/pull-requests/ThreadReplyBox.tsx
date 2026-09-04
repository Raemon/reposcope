'use client';

import { useState } from 'react';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

export function ThreadReplyBox({
  busy,
  onSend,
  onCancel,
}: {
  busy: boolean;
  onSend: (body: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState('');
  const send = () => draft.trim() && onSend(draft.trim());
  return (
    <div className="border-t border-panel-edge px-1.5 py-1">
      <textarea
        autoFocus
        rows={2}
        value={draft}
        disabled={busy}
        placeholder="Reply…"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => replyKey(event, send, onCancel)}
        className="w-full resize-y rounded bg-field px-1 py-0.5 font-serif text-[13px] leading-[1.5] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] tracking-[0.14em]">
        <span className="shrink-0 text-ink-dim">⌘↩</span>
        <button type="button" onClick={onCancel} className={`${BUTTON} px-1`}>
          esc
        </button>
        <button type="button" onClick={send} disabled={busy || !draft.trim()} className={`${BUTTON} px-1`}>
          {busy ? '…' : 'send'}
        </button>
      </div>
    </div>
  );
}

function replyKey(event: React.KeyboardEvent, send: () => void, cancel: () => void) {
  if (event.key === 'Escape') cancel();
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) send();
}
