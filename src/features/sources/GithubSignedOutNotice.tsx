'use client';

import { dismissGithubSignOut, useGithubSignedOut } from './sourceStore';

export function GithubSignedOutNotice({ className = '' }: { className?: string }) {
  const signedOut = useGithubSignedOut();
  if (signedOut === null) return null;
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-[10px] text-error-ink ${className}`}>
      {signedOut.reason}
      <a href={`/api/github/connect?access=${signedOut.access}`} className="underline hover:text-ink">
        reconnect
      </a>
      <button type="button" onClick={dismissGithubSignOut} aria-label="Dismiss GitHub sign-in notice" className="hover:text-ink">
        ×
      </button>
    </span>
  );
}
