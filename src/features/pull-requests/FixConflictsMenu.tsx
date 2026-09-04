'use client';

import { headCommit } from './headCommit';
import type { PullRequestCommits } from './pullRequests';
import { openStickyColumn } from './stickyColumns';
import { fixConflicts } from '@/features/ai-chat/fixConflicts';
import { useCursorKey } from '@/features/ai-chat/cursorKeyStore';
import type { CursorModel } from '@/features/ai-chat/cursorTypes';
import { latestModel, MODEL_FAMILIES, type ModelFamily } from '@/features/ai-chat/modelFamilies';
import { useCursorAccount, type CursorAccount } from '@/features/ai-chat/useCursorModels';
import type { RepoRef } from '@/features/sources/parseRepoLink';
import { CHOICE } from '@/features/surface-ui/buttonStyles';
import { HoverCardTrigger } from '@/features/surface-ui/HoverCard';
import { PopoverMenu, type PopoverTrigger } from '@/features/surface-ui/PopoverMenu';

const ROW = 'flex w-full items-baseline gap-2 px-2 py-1 text-left text-[11px] leading-4 hover:bg-btn-hover disabled:opacity-40 disabled:hover:bg-transparent';
const NOTE = 'px-2 py-1.5 text-[11px] leading-4 text-ink-dim';

interface MenuProps {
  repo: RepoRef;
  number: number;
  pull: PullRequestCommits;
}

export function FixConflictsMenu(props: MenuProps) {
  const key = useCursorKey();
  const account = useCursorAccount(key);
  return (
    <PopoverMenu align="right-0" panelClass="w-64 py-0.5" trigger={(state) => <MenuButton {...state} number={props.number} />}>
      {(close) => (key === null ? <KeyNote close={close} /> : <FamilyRows account={account} onPick={pickHandler(props, key, close)} />)}
    </PopoverMenu>
  );
}

function pickHandler({ repo, number, pull }: MenuProps, key: string, close: () => void): (model: CursorModel) => void {
  return (model) => {
    close();
    fixConflicts({
      owner: repo.owner,
      repo: repo.name,
      number,
      headRef: pull.headRef,
      baseRef: pull.baseRef,
      headSha: headCommit(pull)?.sha ?? null,
      key,
      model: model.id,
    });
  };
}

function MenuButton({ open, toggle, number }: PopoverTrigger & { number: number }) {
  return (
    <HoverCardTrigger label={`#${number} has conflicts with its base branch; ask a Cursor agent to resolve them`} focusable={false} tooltipStyle>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={toggle} className={`${CHOICE} shrink-0 ${open ? 'bg-btn-active text-accent' : ''}`}>
        Fix Merge Conflicts ▾
      </button>
    </HoverCardTrigger>
  );
}

function KeyNote({ close }: { close: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        close();
        openStickyColumn('ai-chat');
      }}
      className={ROW}
    >
      <span className="text-ink">Add a Cursor API key</span>
      <span className="text-ink-dim">in the ai chat column</span>
    </button>
  );
}

function FamilyRows({ account, onPick }: { account: CursorAccount; onPick: (model: CursorModel) => void }) {
  if (account.error !== null) return <p className={`${NOTE} text-error-ink`}>{account.error}</p>;
  if (account.info === null) return <p className={NOTE}>Loading models…</p>;
  const models = account.info.models;
  return (
    <>
      {MODEL_FAMILIES.map((family) => (
        <FamilyRow key={family.key} family={family} model={latestModel(models, family)} onPick={onPick} />
      ))}
    </>
  );
}

function FamilyRow({ family, model, onPick }: { family: ModelFamily; model: CursorModel | null; onPick: (model: CursorModel) => void }) {
  return (
    <button type="button" disabled={model === null} onClick={() => model !== null && onPick(model)} className={ROW}>
      <span className="shrink-0 text-ink">latest {family.label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-ink-dim">{model === null ? 'not offered' : model.displayName}</span>
    </button>
  );
}
