'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tokenizeCode, type ThemedToken } from './diffHighlight';

const CODE = 'diff-code whitespace-pre text-[11px] leading-[15px]';
const INSET = 'pl-[42px] pr-4';

export function CodeBlockEditor({
  value,
  lang,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  lang: string | null;
  saving: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLTextAreaElement | null>(null);
  const textLines = value.split('\n');
  const highlighted = useHighlightedLines(value, lang);

  useEffect(() => {
    input.current?.focus();
    input.current?.setSelectionRange(0, 0);
  }, []);

  return (
    <div className="relative bg-field pb-5 text-ink ring-1 ring-inset ring-accent">
      <div className="overflow-x-auto">
        <div className="relative w-max min-w-full">
          <pre aria-hidden className={`${CODE} ${INSET} m-0 min-h-[15px]`}>
            {textLines.map((text, index) => (
              <HighlightedLine key={index} tokens={highlighted[index] ?? null} text={text} />
            ))}
          </pre>
          <textarea
            ref={input}
            value={value}
            wrap="off"
            spellCheck={false}
            aria-label="Edit this section"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onCancel();
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) onSave();
              if (event.key === 'Tab') {
                event.preventDefault();
                insertAtCursor(event.currentTarget, '  ', onChange);
              }
            }}
            className={`${CODE} ${INSET} absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent font-mono text-transparent caret-ink outline-none`}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="absolute bottom-1 right-1 z-10 rounded border border-btn-edge bg-btn px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-ink-dim shadow-card hover:bg-btn-hover hover:text-ink disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function HighlightedLine({ tokens, text }: { tokens: ThemedToken[] | null; text: string }) {
  return (
    <div className="h-[15px]">
      {tokens?.length
        ? tokens.map((token, index) => (
            <span key={index} style={token.htmlStyle as CSSProperties}>
              {token.content}
            </span>
          ))
        : text || ' '}
    </div>
  );
}

function useHighlightedLines(value: string, lang: string | null): (ThemedToken[] | null)[] {
  const [highlighted, setHighlighted] = useState<{ source: string; lines: ThemedToken[][] } | null>(null);
  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    tokenizeCode(value, lang).then((lines) => {
      if (!cancelled && lines) setHighlighted({ source: value, lines });
    });
    return () => {
      cancelled = true;
    };
  }, [value, lang]);
  return highlighted?.source === value ? highlighted.lines : [];
}

function insertAtCursor(field: HTMLTextAreaElement, insert: string, onChange: (next: string) => void) {
  const { selectionStart, selectionEnd, value } = field;
  onChange(`${value.slice(0, selectionStart)}${insert}${value.slice(selectionEnd)}`);
  requestAnimationFrame(() => field.setSelectionRange(selectionStart + insert.length, selectionStart + insert.length));
}
