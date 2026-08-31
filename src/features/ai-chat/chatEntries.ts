export interface StreamedEntry {
  id: string;
  kind: 'assistant' | 'thinking';
  text: string;
}

export interface NoteEntry {
  id: string;
  kind: 'user' | 'notice' | 'error';
  text: string;
}

export interface ToolEntry {
  id: string;
  kind: 'tool';
  name: string;
  detail: string;
  done: boolean;
}

export interface ResultEntry {
  id: string;
  kind: 'result';
  text: string;
  branch: string | null;
  prUrl: string | null;
}

export type ChatEntry = StreamedEntry | NoteEntry | ToolEntry | ResultEntry;

let counter = 0;

export function entryId(): string {
  counter += 1;
  return `e${counter}`;
}

export function appendEntry(entries: ChatEntry[], entry: ChatEntry): ChatEntry[] {
  const last = entries[entries.length - 1];
  if (!streamable(entry) || last === undefined || !streamable(last) || last.kind !== entry.kind) return [...entries, entry];
  return [...entries.slice(0, -1), { ...last, text: `${last.text}${entry.text}` }];
}

export function replaceTool(entries: ChatEntry[], entry: Extract<ChatEntry, { kind: 'tool' }>): ChatEntry[] {
  const at = entries.findIndex((held) => held.kind === 'tool' && held.id === entry.id);
  if (at < 0) return [...entries, entry];
  return entries.map((held, index) => (index === at ? entry : held));
}

function streamable(entry: ChatEntry): entry is StreamedEntry {
  return entry.kind === 'assistant' || entry.kind === 'thinking';
}
