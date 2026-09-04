'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HoverCardTrigger } from './HoverCard';

const COPIED_MS = 1200;

export function CopyButton({
  value,
  what,
  ariaLabel,
  className,
  idleClassName = '',
  children,
}: {
  value: string;
  what: string;
  ariaLabel: string;
  className: string;
  idleClassName?: string;
  children: ReactNode;
}) {
  const [copied, markCopied] = useCopiedFlag();
  const copy = () => void navigator.clipboard?.writeText(value).then(markCopied, () => {});
  return (
    <HoverCardTrigger label={`${copied ? 'copied' : 'copy'} ${what}`} className="shrink-0" focusable={false} tooltipStyle>
      <button type="button" aria-label={ariaLabel} onClick={copy} className={`${className} ${copied ? 'text-accent' : idleClassName}`}>
        {children}
      </button>
    </HoverCardTrigger>
  );
}

function useCopiedFlag(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const markCopied = () => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };
  return [copied, markCopied];
}
