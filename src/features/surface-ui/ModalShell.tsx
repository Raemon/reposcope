'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function ModalShell({
  label,
  dismissable,
  onDismiss,
  children,
}: {
  label: string;
  dismissable: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    panel.current?.showModal();
  }, []);

  return (
    <dialog
      ref={panel}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        if (dismissable) onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissable) onDismiss();
      }}
      className="m-auto w-full max-w-lg rounded bg-panel p-0 text-ink shadow-card backdrop:bg-black/50"
    >
      <div className="p-3">
        <h2 className="text-[12px] text-ink">{label}</h2>
        {children}
      </div>
    </dialog>
  );
}
