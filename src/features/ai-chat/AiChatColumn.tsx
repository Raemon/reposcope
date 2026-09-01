'use client';

import { ChatComposer } from './ChatComposer';
import { ChatTranscript } from './ChatTranscript';
import { CursorKeyForm } from './CursorKeyForm';
import { statusBusy, statusLabel } from './chatStatus';
import { useAiChat } from './useAiChat';
import { useCursorKey, writeCursorKey } from './cursorKeyStore';
import type { ChatSession } from './aiChatStore';
import { ColumnPreview, type PreviewToken } from '@/features/pull-requests/ColumnPreview';
import { useRegisterColumn } from '@/features/pull-requests/columnNav';
import { usePaneMode } from '@/features/pull-requests/centralLayout';
import { collapsibleColumn, ResizableColumn } from '@/features/pull-requests/ResizableColumn';
import { useStickyColumn } from '@/features/pull-requests/stickyColumns';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

const ICON = '✳';
const ACTION = `${BUTTON} mr-1 shrink-0 px-1 py-[1px] text-[9px]`;

export function AiChatColumn({ owner, repo, subject, headRef }: { owner: string; repo: string; subject: string; headRef: string | null }) {
  const [size, setSize] = useStickyColumn('ai-chat');
  const pane = usePaneMode('ai-chat');
  const key = useCursorKey();
  const chat = useAiChat({ subject, owner, repo, headRef, active: pane === 'pane' || size.open });
  const { session, account } = chat;
  useRegisterColumn('ai-chat', { ...collapsibleColumn(size, setSize), items: [], selected: null }, pane !== 'hidden');
  return (
    <ResizableColumn
      navId="ai-chat"
      side="right"
      icon={ICON}
      title="ai chat"
      note={key === null ? 'needs key' : statusLabel(session)}
      preview={<ColumnPreview column="ai-chat" tokens={previewTokens(session, key)} />}
      size={size}
      onSize={setSize}
      action={key === null ? undefined : <HeaderActions session={session} onRestart={() => chat.restart(chat.model)} />}
      footer={
        key === null ? null : (
          <ChatComposer
            busy={statusBusy(session)}
            disabled={account.error !== null}
            models={account.info?.models ?? []}
            model={chat.model}
            onModel={chat.restart}
            onSend={chat.send}
          />
        )
      }
    >
      {key === null ? (
        <CursorKeyForm error={account.error} />
      ) : (
        <>
          {account.error !== null && <p className="px-1.5 py-1 text-[10px] leading-4 text-error-ink">{account.error}</p>}
          <ChatTranscript entries={session.entries} owner={owner} repo={repo} busy={statusBusy(session)} />
        </>
      )}
    </ResizableColumn>
  );
}

function HeaderActions({ session, onRestart }: { session: ChatSession; onRestart: () => void }) {
  return (
    <>
      {session.agentUrl !== null && (
        <a href={session.agentUrl} target="_blank" rel="noopener noreferrer" className={`${ACTION} inline-block`}>
          cursor ↗
        </a>
      )}
      <button type="button" onClick={onRestart} className={ACTION}>
        new
      </button>
      <button type="button" onClick={() => writeCursorKey(null)} className={ACTION}>
        key
      </button>
    </>
  );
}

function previewTokens(session: ChatSession, key: string | null): PreviewToken[] {
  if (key === null) return [{ key: 'ai-key', label: '⚿', title: 'Add a Cursor API key' }];
  if (statusBusy(session)) return [{ key: 'ai-busy', label: '◍', title: `Agent ${statusLabel(session)}` }];
  if (session.entries.length === 0) return [];
  return [{ key: 'ai-count', label: String(session.entries.length), title: 'Transcript entries' }];
}
