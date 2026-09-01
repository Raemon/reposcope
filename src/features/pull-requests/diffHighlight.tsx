'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';

export type { ThemedToken };

const EXTENSION_LANGS: [string, string][] = [
  ['.tsx', 'tsx'], ['.mts', 'typescript'], ['.cts', 'typescript'], ['.ts', 'typescript'],
  ['.jsx', 'jsx'], ['.mjs', 'javascript'], ['.cjs', 'javascript'], ['.js', 'javascript'],
  ['.vue', 'vue'], ['.svelte', 'svelte'], ['.astro', 'astro'],
  ['.py', 'python'], ['.rb', 'ruby'], ['.go', 'go'], ['.rs', 'rust'], ['.php', 'php'],
  ['.java', 'java'], ['.kts', 'kotlin'], ['.kt', 'kotlin'], ['.cs', 'csharp'], ['.swift', 'swift'],
  ['.scala', 'scala'], ['.cpp', 'cpp'], ['.hpp', 'cpp'], ['.cc', 'cpp'], ['.hh', 'cpp'],
  ['.c', 'c'], ['.h', 'c'], ['.mm', 'objective-c'], ['.m', 'objective-c'],
  ['.sh', 'shellscript'], ['.bash', 'shellscript'], ['.zsh', 'shellscript'],
  ['.sql', 'sql'], ['.graphql', 'graphql'], ['.gql', 'graphql'], ['.prisma', 'prisma'], ['.proto', 'proto'],
  ['.css', 'css'], ['.scss', 'scss'], ['.less', 'less'],
  ['.yml', 'yaml'], ['.yaml', 'yaml'], ['.toml', 'toml'],
  ['.jsonc', 'jsonc'], ['.json', 'jsonc'],
  ['.html', 'html'], ['.xml', 'xml'], ['.mdx', 'markdown'], ['.md', 'markdown'],
];

export function langForPath(path: string): string | null {
  const lower = path.toLowerCase();
  for (const [extension, lang] of EXTENSION_LANGS) {
    if (lower.endsWith(extension)) return lang;
  }
  if (/(?:^|\/)dockerfile$/.test(lower)) return 'docker';
  if (/(?:^|\/)makefile$/.test(lower)) return 'make';
  return null;
}

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();

export async function tokenizeCode(text: string, lang: string): Promise<ThemedToken[][] | null> {
  try {
    highlighterPromise ??= createHighlighter({ themes: ['github-light', 'github-dark'], langs: [] });
    const highlighter = await highlighterPromise;
    if (!loadedLangs.has(lang)) {
      await highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]);
      loadedLangs.add(lang);
    }
    return highlighter.codeToTokens(text, {
      lang: lang as Parameters<Highlighter['codeToTokens']>[1]['lang'],
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      includeExplanation: 'scopeName',
    }).tokens;
  } catch {
    return null;
  }
}

export function useTokenized(text: string, lang: string | null): ThemedToken[][] | null {
  const [done, setDone] = useState<{ text: string; lines: ThemedToken[][] } | null>(null);
  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    tokenizeCode(text, lang).then((lines) => {
      if (!cancelled && lines) setDone({ text, lines });
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang]);
  return done?.text === text ? done.lines : null;
}

export function CodeTokens({ tokens, text }: { tokens: ThemedToken[] | null; text: string }) {
  if (!tokens?.length) return <>{text || ' '}</>;
  return (
    <>
      {tokens.map((token, index) => (
        <span key={index} style={token.htmlStyle as CSSProperties}>
          {token.content}
        </span>
      ))}
    </>
  );
}
