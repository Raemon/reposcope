'use client';

import { useEffect, useState } from 'react';
import { deleteFilePath } from './pullPaths';
import type { EditResult } from './pullRequests';
import { apiPostJson } from '@/features/sources/apiClient';
import { errorMessage } from '@/features/sources/errorMessage';

export interface FileDeletionControls {
  asking: string | null;
  deleting: boolean;
  failure: string | null;
  ask: (filename: string) => void;
  confirm: () => void;
  cancel: () => void;
}

export function useFileDeletion({
  owner,
  repo,
  number,
  headRef,
  token,
  onDeleted,
}: {
  owner: string;
  repo: string;
  number: number | null;
  headRef: string | null;
  token: string | null;
  onDeleted: (filename: string) => void | Promise<void>;
}): FileDeletionControls {
  const [asking, setAsking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const cancel = () => {
    setAsking(null);
    setFailure(null);
  };

  useEffect(cancel, [owner, repo, number]);

  async function confirm() {
    if (asking === null || number === null || headRef === null || deleting) return;
    setDeleting(true);
    setFailure(null);
    try {
      await postDeletion({ owner, repo, number, headRef, token, path: asking });
    } catch (issue: unknown) {
      setFailure(errorMessage(issue));
      setDeleting(false);
      return;
    }
    const deleted = asking;
    cancel();
    setDeleting(false);
    await onDeleted(deleted);
  }

  return { asking, deleting, failure, ask: setAsking, confirm, cancel };
}

function postDeletion({
  owner,
  repo,
  number,
  headRef,
  token,
  path,
}: {
  owner: string;
  repo: string;
  number: number;
  headRef: string;
  token: string | null;
  path: string;
}): Promise<EditResult> {
  return apiPostJson<EditResult>(deleteFilePath(owner, repo, number), token, {
    path,
    headRef,
    message: `Delete ${path}`,
  });
}
