'use client';

import { useEffect, useState } from 'react';
import { DragHandle, useDragWidth, type ColumnSize } from './ResizableColumn';
import type { FileBlob } from './pullRequests';
import { apiJson } from '@/features/sources/apiClient';
import { useGithubToken } from '@/features/sources/sourceStore';

const CHECKERBOARD = {
  backgroundImage:
    'linear-gradient(45deg, var(--color-panel-edge) 25%, transparent 25%), linear-gradient(-45deg, var(--color-panel-edge) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-panel-edge) 75%), linear-gradient(-45deg, transparent 75%, var(--color-panel-edge) 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
};

interface ImageSource {
  ref: string;
  path: string;
}

export function ImageDiff({
  owner,
  repo,
  before,
  after,
}: {
  owner: string;
  repo: string;
  before: ImageSource | null;
  after: ImageSource | null;
}) {
  const [beforeSize, setBeforeSize] = useState<ColumnSize>({ width: 520, open: true });
  const startDrag = useDragWidth(beforeSize, setBeforeSize);
  return (
    <div className="flex">
      <section
        className="relative flex shrink-0 flex-col border-r border-panel-edge"
        style={{ width: beforeSize.width }}
      >
        <ImagePane owner={owner} repo={repo} label="before" source={before} />
        <DragHandle onPointerDown={startDrag} />
      </section>
      <section className="flex min-w-0 flex-1 flex-col">
        <ImagePane owner={owner} repo={repo} label="after" source={after} />
      </section>
    </div>
  );
}

function ImagePane({
  owner,
  repo,
  label,
  source,
}: {
  owner: string;
  repo: string;
  label: string;
  source: ImageSource | null;
}) {
  const blob = useFileBlob(owner, repo, source);
  const [shape, setShape] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-baseline gap-2 px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-ink-dim">
        <span>{label}</span>
        {shape && <span className="tracking-normal normal-case">{shape}</span>}
        {blob.value && <span className="tracking-normal normal-case">{byteLabel(blob.value.byteSize)}</span>}
      </div>
      <div style={CHECKERBOARD} className="flex min-h-[80px] flex-1 items-center justify-center p-3">
        {!source ? (
          <PaneNote text={label === 'before' ? 'added in this change' : 'deleted in this change'} />
        ) : blob.error ? (
          <PaneNote text={blob.error} />
        ) : !blob.value ? (
          <PaneNote text="Loading…" />
        ) : !blob.value.dataUrl ? (
          <PaneNote text={`too large to preview (${byteLabel(blob.value.byteSize)})`} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={blob.value.dataUrl}
            alt={`${label} — ${source.path}`}
            onLoad={(event) => setShape(`${event.currentTarget.naturalWidth}×${event.currentTarget.naturalHeight}`)}
            className="max-h-[420px] max-w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}

function useFileBlob(owner: string, repo: string, source: ImageSource | null) {
  const token = useGithubToken();
  const [value, setValue] = useState<FileBlob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = source?.ref ?? null;
  const path = source?.path ?? null;

  useEffect(() => {
    if (!ref || !path) return;
    const controller = new AbortController();
    setValue(null);
    setError(null);
    apiJson<FileBlob>(
      `/api/github/blob?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(repo)}&ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`,
      token,
      controller.signal,
    )
      .then(setValue)
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : String(issue));
      });
    return () => controller.abort();
  }, [owner, repo, ref, path, token]);

  return { value, error };
}

function PaneNote({ text }: { text: string }) {
  return <p className="text-[10px] text-ink-dim">{text}</p>;
}

function byteLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
