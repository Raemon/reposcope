'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { parseOwnerInput, parseRepoLink } from './parseRepoLink';
import { repoRoute } from '@/features/codebases/repoPaths';
import { addSource } from './sourceStore';
import type { GithubAccess } from '@/features/github-auth/githubAccess';

const FIELD =
  'min-w-0 flex-1 rounded bg-field px-2 py-1 text-[11px] text-ink outline-none placeholder:text-ink-dim focus:ring-1 focus:ring-accent';
const BUTTON =
  'shrink-0 rounded bg-btn px-2.5 py-1 text-[11px] text-ink hover:bg-btn-hover active:bg-btn-active';

export function SourceControls({ compact = false, signInAvailable }: { compact?: boolean; signInAvailable: boolean }) {
  const router = useRouter();
  const [repoError, setRepoError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  const submitRepo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseRepoLink(String(new FormData(event.currentTarget).get('repo') ?? ''));
    if (!parsed.ok) {
      setRepoError(parsed.error);
      return;
    }
    setRepoError(null);
    addSource({ kind: 'repo', ...parsed.value });
    router.push(repoRoute(parsed.value.owner, parsed.value.name));
  };

  const submitOwner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = parseOwnerInput(String(new FormData(form).get('owner') ?? ''));
    if (!parsed.ok) {
      setOwnerError(parsed.error);
      return;
    }
    setOwnerError(null);
    addSource({ kind: 'owner', login: parsed.value });
    form.reset();
  };

  return (
    <div className={compact ? 'mt-5 flex flex-col gap-2' : 'mt-5 flex flex-col gap-3'}>
      <SourceCard compact={compact} title="A single repository" error={repoError}>
        <form onSubmit={submitRepo} className="flex gap-2">
          <input name="repo" placeholder="https://github.com/owner/repo" aria-label="Repository link" className={FIELD} />
          <button type="submit" className={BUTTON}>
            Add
          </button>
        </form>
      </SourceCard>
      <SourceCard
        compact={compact}
        title="Every public repository of a user or organization"
        note="A GitHub login — either a person or an organization."
        error={ownerError}
      >
        <form onSubmit={submitOwner} className="flex gap-2">
          <input name="owner" placeholder="LessWrong2" aria-label="GitHub login" className={FIELD} />
          <button type="submit" className={BUTTON}>
            Add
          </button>
        </form>
      </SourceCard>
      <SourceCard
        compact={compact}
        title="Only the public repositories you can see on GitHub"
        note={
          signInAvailable
            ? 'Asks GitHub for access to public repositories only; your private repositories stay out of reposcope.'
            : 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable this.'
        }
      >
        <ConnectButton signInAvailable={signInAvailable} access="public" label="Connect GitHub (public only)" />
      </SourceCard>
      <SourceCard
        compact={compact}
        title="Everything you can see on GitHub, public and private"
        note={
          signInAvailable
            ? 'Opens GitHub\u2019s authorization page; reposcope asks for read access to your repositories and keeps the token only in your browser\u2019s localStorage.'
            : 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable this.'
        }
      >
        <ConnectButton signInAvailable={signInAvailable} access="all" label="Connect GitHub" />
      </SourceCard>
    </div>
  );
}

function ConnectButton({
  signInAvailable,
  access,
  label,
}: {
  signInAvailable: boolean;
  access: GithubAccess;
  label: string;
}) {
  if (!signInAvailable) {
    return (
      <button type="button" disabled className={`${BUTTON} cursor-not-allowed opacity-50`}>
        {label}
      </button>
    );
  }
  return (
    <a href={`/api/github/connect?access=${access}`} className={`inline-block ${BUTTON}`}>
      {label}
    </a>
  );
}

function SourceCard({
  compact,
  title,
  note,
  error,
  children,
}: {
  compact: boolean;
  title: string;
  note?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <section className={`rounded bg-panel ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <h2 className={compact ? 'text-[11px] text-ink' : 'text-xs text-ink'}>{title}</h2>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-[10px] leading-4 text-error-ink">{error}</p>}
      {note && <p className="mt-2 text-[10px] leading-4 text-ink-dim">{note}</p>}
    </section>
  );
}
