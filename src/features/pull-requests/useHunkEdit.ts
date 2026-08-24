'use client';

import { useCallback, useEffect, useState } from 'react';
import { commitMessageFor, editableBlockAt, type EditableBlock } from './editableBlocks';
import type { DiffRow } from './splitDiff';
import { apiPostJson } from '@/features/sources/apiClient';

interface EditablePull {
  number: number;
  title: string;
}

export interface HunkEdit {
  block: EditableBlock;
  draft: string;
  height: number;
}

export function useHunkEdit({
  owner,
  repo,
  pull,
  rows,
  filename,
  patch,
  token,
  onCommitted,
}: {
  owner: string;
  repo: string;
  pull: EditablePull | null;
  rows: DiffRow[];
  filename: string;
  patch: string;
  token: string | null;
  onCommitted?: () => void;
}) {
  const [edit, setEdit] = useState<HunkEdit | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setEdit(null);
    setMessage(null);
    setFailure(null);
  }, [patch, filename]);

  const setHeight = useCallback((height: number) => {
    setEdit((was) => (was && was.height !== height ? { ...was, height } : was));
  }, []);

  function begin(rowIndex: number) {
    if (!pull || edit) return;
    const block = editableBlockAt(rows, rowIndex);
    if (block) setEdit({ block, draft: block.text, height: 0 });
  }

  function askToCommit() {
    if (!edit || !pull) return;
    if (edit.draft === edit.block.text) {
      setEdit(null);
      return;
    }
    setFailure(null);
    setMessage(commitMessageFor(pull, edit.block.text, edit.draft));
  }

  async function commit() {
    if (!edit || !pull || message === null) return;
    setCommitting(true);
    setFailure(null);
    try {
      await apiPostJson(
        `/api/github/commit-file?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&number=${pull.number}`,
        token,
        {
          path: filename,
          startLine: edit.block.startLine,
          endLine: edit.block.endLine,
          original: edit.block.text,
          updated: edit.draft,
          message,
        },
      );
      setEdit(null);
      setMessage(null);
      onCommitted?.();
    } catch (issue: unknown) {
      setFailure(issue instanceof Error ? issue.message : String(issue));
    } finally {
      setCommitting(false);
    }
  }

  return {
    edit,
    message,
    committing,
    failure,
    begin,
    askToCommit,
    commit,
    setHeight,
    setDraft: (draft: string) => setEdit((was) => (was ? { ...was, draft } : was)),
    setMessage,
    close: () => {
      setEdit(null);
      setMessage(null);
      setFailure(null);
    },
    dismissModal: () => {
      setMessage(null);
      setFailure(null);
    },
  };
}
