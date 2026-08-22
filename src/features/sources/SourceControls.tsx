'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { parseOwnerInput, parseRepoLink } from './parseRepoLink';
import { addSource } from './sourceStore';

const FIELD =
  'min-w-0 flex-1 rounded border border-btn-edge bg-field px-2 py-1 text-[11px] text-ink outline-none placeholder:text-ink-dim focus:border-accent';
const BUTTON =
  'shrink-0 rounded border border-btn-edge bg-btn px-2.5 py-1 text-[11px] text-ink hover:bg-btn-hover active:bg-btn-active';

export function SourceControls({ compact = false, oauthConfigured }: { compact?: boolean; oauthConfigured: boolean }) {
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
    router.push(`/repo/${parsed.value.owner}/${parsed.value.name}`);
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
        title="Everything you can see on GitHub, public and private"
        note={
          oauthConfigured
            ? 'Opens GitHub’s authorization page; apiscope asks for read access to your repositories and keeps the token only in your browser’s localStorage.'
            : 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable this.'
        }
      >
        {oauthConfigured ? (
          <a href="/api/github/connect" className={`inline-block ${BUTTON}`}>
            Connect GitHub
          </a>
        ) : (
          <button type="button" disabled className={`${BUTTON} cursor-not-allowed opacity-50`}>
            Connect GitHub
          </button>
        )}
      </SourceCard>
    </div>
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
    <section className={`rounded border border-panel-edge bg-panel ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <h2 className={compact ? 'text-[11px] text-ink' : 'text-xs text-ink'}>{title}</h2>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-[10px] leading-4 text-error-ink">{error}</p>}
      {note && <p className="mt-2 text-[10px] leading-4 text-ink-dim">{note}</p>}
    </section>
  );
}
