import type { CodebaseFile } from '@/features/codebases/codebaseSource';
import type { SourceLocation } from '@/features/surface-ui/sourceLocation';

const EXCERPT_LIMIT = 180;

export interface ScannedFile {
  path: string;
  source: string;
  lines: string[];
}

export function scanned(file: CodebaseFile): ScannedFile {
  return { path: file.path, source: file.source, lines: file.source.split(/\r?\n/) };
}

export function locationAt(file: ScannedFile, lineIndex: number): SourceLocation {
  const excerpt = (file.lines[lineIndex] ?? '').trim();
  return {
    file: file.path,
    line: lineIndex + 1,
    excerpt: excerpt.length > EXCERPT_LIMIT ? `${excerpt.slice(0, EXCERPT_LIMIT)}…` : excerpt,
  };
}

export function fileNameOf(path: string): string {
  return path.split('/').at(-1)!;
}

export function countLines(source: string): number {
  let count = 1;
  for (let at = 0; at < source.length; at += 1) {
    if (source.charCodeAt(at) === 10) count += 1;
  }
  return count;
}
