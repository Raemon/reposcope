import type { DiffCell, DiffRow } from './splitDiff';

const FOLD_GAP = ' … ';

const DECLARING_KEYWORD =
  /^\s*(?:(?:export|default|public|private|protected|static|abstract|async|declare|pub)\s+)*(?:function\s*\(|(?:function|class|interface|type|enum|namespace|module|def|func|fn|impl|struct|trait)\s+[\w$<])/;
const BINDING_KEYWORD = /^\s*(?:export\s+)?(?:const|let|var)\b/;
const FUNCTION_VALUE = /=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]*)?=>|[\w$]+\s*=>)/;
const CONTROL_KEYWORD = /^\s*(?:if|for|while|switch|catch|do|try|else|return|new|await|typeof|import|export)\b/;
const METHOD_SIGNATURE = /^\s*[\w$]+\s*(?:<[^>]*>)?\([^)]*\)\s*(?::[^{]*)?\{\s*$/;

interface OpenBlock {
  header: DiffRow;
  outerDepth: number;
}

interface Outline {
  headers: DiffRow[];
  open: OpenBlock[];
  depth: number;
}

export function outlineRows(rows: DiffRow[]): DiffRow[] {
  const outline: Outline = { headers: [], open: [], depth: 0 };
  for (const row of rows) if (row.kind !== 'hunk') absorbRow(outline, row);
  return outline.headers;
}

function absorbRow(outline: Outline, row: DiffRow): void {
  const text = rowText(row);
  if (isDeclaration(text)) outline.headers.push(openBlock(outline, row, text));
  outline.depth = Math.max(0, outline.depth + braceDelta(text));
  closeFinishedBlocks(outline, text.trim());
}

function openBlock(outline: Outline, row: DiffRow, text: string): DiffRow {
  const header = { ...row, left: copyCell(row.left), right: copyCell(row.right) };
  if (braceDelta(text) > 0) outline.open.push({ header, outerDepth: outline.depth });
  return header;
}

function closeFinishedBlocks(outline: Outline, closing: string): void {
  while (outline.open.length > 0 && outline.depth <= lastOpen(outline).outerDepth) {
    appendClosing(outline.open.pop()!.header, closing);
  }
}

function lastOpen(outline: Outline): OpenBlock {
  return outline.open[outline.open.length - 1]!;
}

function appendClosing(header: DiffRow, closing: string): void {
  header.left = withClosing(header.left, closing);
  header.right = withClosing(header.right, closing);
}

function withClosing(cell: DiffCell | null, closing: string): DiffCell | null {
  return cell && { ...cell, text: `${cell.text.trimEnd()}${FOLD_GAP}${closing}` };
}

function copyCell(cell: DiffCell | null): DiffCell | null {
  return cell && { ...cell };
}

function rowText(row: DiffRow): string {
  return (row.right ?? row.left)?.text ?? '';
}

function isDeclaration(text: string): boolean {
  if (DECLARING_KEYWORD.test(text)) return true;
  if (BINDING_KEYWORD.test(text)) return FUNCTION_VALUE.test(text) || /\{\s*$/.test(text);
  return METHOD_SIGNATURE.test(text) && !CONTROL_KEYWORD.test(text);
}

function braceDelta(text: string): number {
  const code = stripLiterals(text);
  return count(code, '{') - count(code, '}');
}

function stripLiterals(text: string): string {
  return text
    .replace(/\/\/.*$/, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '');
}

function count(text: string, character: string): number {
  return text.split(character).length - 1;
}
