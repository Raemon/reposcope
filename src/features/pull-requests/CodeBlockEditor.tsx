'use client';

import { useEffect, useRef } from 'react';
import { CodeTokens, useTokenized } from './diffHighlight';
import { ROW_HEIGHT } from './diffMetrics';
import { BUTTON } from '@/features/surface-ui/buttonStyles';

const CODE = 'diff-code whitespace-pre pl-[42px] pr-24 text-[11px] leading-[15px]';

export function CodeBlockEditor({
  value,
  lang,
  caretLine,
  minHeight,
  saving,
  onChange,
  onSave,
  onExit,
}: {
  value: string;
  lang: string | null;
  caretLine: number;
  minHeight: number;
  saving: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
  onExit: () => void;
}) {
  const input = useRef<HTMLTextAreaElement | null>(null);
  const mirror = useRef<HTMLPreElement | null>(null);
  const textLines = value.split('\n');
  const highlighted = useTokenized(value, lang);

  useEffect(() => {
    placeCaret(input.current, caretLine);
  }, [caretLine]);

  return (
    <div className="relative flex flex-col bg-field text-ink ring-1 ring-inset ring-accent" style={{ minHeight }}>
      <div className="relative" style={{ height: textLines.length * ROW_HEIGHT }}>
        <pre ref={mirror} aria-hidden className={`${CODE} absolute inset-0 m-0 overflow-hidden`}>
          {textLines.map((text, index) => (
            <div key={index} className="h-[15px]">
              <CodeTokens tokens={highlighted?.[index] ?? null} text={text} />
            </div>
          ))}
        </pre>
        <textarea
          ref={input}
          value={value}
          wrap="off"
          spellCheck={false}
          aria-label="Edit this section"
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (mirror.current) mirror.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onExit();
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) onSave();
          }}
          className={`${CODE} absolute inset-0 h-full w-full resize-none overflow-x-auto overflow-y-hidden border-0 bg-transparent font-mono text-transparent caret-ink outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        />
      </div>
      <div className="sticky bottom-0 z-10 mt-auto flex h-7 items-center justify-end px-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title="Save and commit (⌘⏎)"
          className={`${BUTTON} px-2 py-[2px] text-[9px] shadow-card`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function placeCaret(field: HTMLTextAreaElement | null, caretLine: number) {
  if (!field) return;
  window.getSelection()?.removeAllRanges();
  field.focus({ preventScroll: true });
  const caret = field.value.split('\n').slice(0, caretLine).join('\n').length + (caretLine > 0 ? 1 : 0);
  field.setSelectionRange(caret, caret);
}
