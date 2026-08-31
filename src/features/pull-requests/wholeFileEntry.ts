import { splitLines } from './expandDiff';
import type { ChangedFile, ChangedFileSet } from './pullRequests';

export const WHOLE_FILE_STATUS = 'file';

export function wholeFileSet(ref: string, filename: string, text: string | null): ChangedFileSet {
  return { baseRef: ref, headRef: ref, files: [wholeFileEntry(filename, text)] };
}

export function wholeFileEntry(filename: string, text: string | null): ChangedFile {
  return {
    filename,
    previousFilename: null,
    status: WHOLE_FILE_STATUS,
    additions: 0,
    deletions: 0,
    patch: text === null ? null : contextPatch(text),
  };
}

function contextPatch(text: string): string {
  const lines = splitLines(text);
  return `@@ -1,${lines.length} +1,${lines.length} @@\n${lines.map((line) => ` ${line}`).join('\n')}`;
}
