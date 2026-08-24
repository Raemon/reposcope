'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tokenizeCode, type ThemedToken } from './diffHighlight';
import { SMALL_BUTTON } from '@/features/surface-ui/buttonStyles';

const CODE = 'diff-code whitespace-pre pl-[42px] pr-24 text-[11px] leading-[15px]';
const LINE_HEIGHT = 15;

export function CodeBlockEditor({
  value,
  lang,
  caretLine,
  saving,
  onChange,
  onSave,
  onCancel,
  onHeight,
}: {
  value: string;
  lang: string | null;
  caretLine: number;
  saving: boolean;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onHeight: (pixels: number) => void;
}) {
  const input = useRef<HTMLTextAreaElement | null>(null);
  const mirror = useRef<HTMLPreElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const textLines = value.split('\n');
  const highlighted = useHighlightedLines(value, lang);

  useEffect(() => {
    const field = input.current;
    if (!field) return;
    window.getSelection()?.removeAllRanges();
    field.focus({ preventScroll: true });
    const caret = field.value.split('\n').slice(0, caretLine).join('\n').length + (caretLine > 0 ? 1 : 0);
    field.setSelectionRange(caret, caret);
  }, [caretLine]);

  useEffect(() => {
    const box = frame.current;
    if (!box) return;
    const report = () => onHeight(box.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(box);
    return () => observer.disconnect();
  }, [onHeight]);

  return (
    <div ref={frame} className="relative bg-field text-ink ring-1 ring-inset ring-accent">
      <div className="relative" style={{ height: textLines.length * LINE_HEIGHT }}>
        <pre ref={mirror} aria-hidden className={`${CODE} absolute inset-0 m-0 overflow-hidden`}>
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
          onScroll={(event) => {
            if (mirror.current) mirror.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel();
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) onSave();
          }}
          className={`${CODE} absolute inset-0 h-full w-full resize-none overflow-x-auto overflow-y-hidden border-0 bg-transparent font-mono text-transparent caret-ink outline-none`}
        />
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end p-1">
        <button type="button" onClick={onSave} disabled={saving} className={SMALL_BUTTON} title="Save and commit (⌘⏎)">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
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
  const [lines, setLines] = useState<ThemedToken[][]>([]);
  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    tokenizeCode(value, lang).then((tokenized) => {
      if (!cancelled && tokenized) setLines(tokenized);
    });
    return () => {
      cancelled = true;
    };
  }, [value, lang]);
  return lines;
}
