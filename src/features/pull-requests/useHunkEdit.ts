'use client';

import { useEffect, useState } from 'react';
import { commitMessageFor, editableBlockAt, type EditableBlock } from './editableBlocks';
import type { PullRequestSummary } from './pullRequests';
import type { DiffRow } from './splitDiff';
import { apiPostJson } from '@/features/sources/apiClient';

export interface HunkEdit {
  block: EditableBlock;
  draft: string;
}

export function useHunkEdit({
  owner,
  repo,
  pull,
  headRef,
  rows,
  filename,
  patch,
  token,
  onCommitted,
}: {
  owner: string;
  repo: string;
  pull: PullRequestSummary | null;
  headRef: string;
  rows: DiffRow[];
  filename: string;
  patch: string;
  token: string | null;
  onCommitted?: () => void | Promise<void>;
}) {
  const [edit, setEdit] = useState<HunkEdit | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const dismissModal = () => {
    setMessage(null);
    setFailure(null);
  };

  const close = () => {
    setEdit(null);
    dismissModal();
  };

  useEffect(close, [patch, filename]);

  function begin(rowIndex: number) {
    if (!pull || committing || (edit && edit.draft !== edit.block.text)) return;
    const block = editableBlockAt(rows, rowIndex);
    if (block) setEdit({ block, draft: block.text });
  }

  function askToCommit() {
    if (!edit || !pull || committing) return;
    if (edit.draft === edit.block.text) close();
    else setMessage(commitMessageFor(pull, edit.block.text, edit.draft));
  }

  // Optimistic: dismiss the modal right away and leave the editor showing the
  // committed content until the refreshed diff replaces it.
  async function commit() {
    if (!edit || !pull || message === null || committing) return;
    const refresh = onCommitted;
    setCommitting(true);
    setFailure(null);
    setMessage(null);
    try {
      await postHunkCommit({ owner, repo, pull, headRef, filename, token, edit, message });
    } catch (issue: unknown) {
      setMessage(message);
      setFailure(issue instanceof Error ? issue.message : String(issue));
      setCommitting(false);
      return;
    }
    if (refresh) await refresh();
    close();
    setCommitting(false);
  }

  return {
    edit,
    message,
    committing,
    failure,
    begin,
    askToCommit,
    commit,
    close,
    dismissModal,
    setDraft: (draft: string) => setEdit((was) => (was ? { ...was, draft } : was)),
    setMessage,
  };
}

function postHunkCommit({
  owner,
  repo,
  pull,
  headRef,
  filename,
  token,
  edit,
  message,
}: {
  owner: string;
  repo: string;
  pull: PullRequestSummary;
  headRef: string;
  filename: string;
  token: string | null;
  edit: HunkEdit;
  message: string;
}) {
  return apiPostJson(
    `/api/github/commit-file?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&number=${pull.number}`,
    token,
    {
      path: filename,
      headRef,
      startLine: edit.block.startLine,
      endLine: edit.block.endLine,
      original: edit.block.text,
      updated: edit.draft,
      message,
    },
  );
}
