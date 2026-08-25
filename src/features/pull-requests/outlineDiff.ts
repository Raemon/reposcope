import type { DiffCell, DiffRow } from './splitDiff';

const FOLD_GAP = ' … ';
const SIDES = ['left', 'right'] as const;

type Side = (typeof SIDES)[number];

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

interface SideOutline {
  depth: number;
  open: OpenBlock[];
}

interface Outline {
  headers: DiffRow[];
  sides: Record<Side, SideOutline>;
}

export function outlineRows(rows: DiffRow[]): DiffRow[] {
  const outline: Outline = { headers: [], sides: { left: emptySide(), right: emptySide() } };
  for (const row of rows) {
    if (row.kind === 'hunk') forgetOpenBlocks(outline);
    else absorbRow(outline, row);
  }
  return outline.headers;
}

function emptySide(): SideOutline {
  return { depth: 0, open: [] };
}

function forgetOpenBlocks(outline: Outline): void {
  for (const side of SIDES) outline.sides[side] = emptySide();
}

function absorbRow(outline: Outline, row: DiffRow): void {
  const header = headerFor(row);
  if (header) outline.headers.push(header);
  if (row.kind === 'change') markOpenBlocksTouched(outline);
  for (const side of SIDES) absorbCell(outline.sides[side], side, row, header);
}

function headerFor(row: DiffRow): DiffRow | null {
  const declares = SIDES.some((side) => declaresBlock(row[side]));
  return declares ? { ...row, left: copyCell(row.left), right: copyCell(row.right) } : null;
}

function markOpenBlocksTouched(outline: Outline): void {
  for (const side of SIDES) for (const block of outline.sides[side].open) block.header.touched = true;
}

function absorbCell(side: SideOutline, sideName: Side, row: DiffRow, header: DiffRow | null): void {
  const cell = row[sideName];
  if (!cell) return;
  const delta = braceDelta(cell.text);
  if (header && delta > 0 && declaresBlock(cell)) side.open.push({ header, outerDepth: side.depth });
  side.depth = Math.max(0, side.depth + delta);
  closeFinishedBlocks(side, sideName, cell.text.trim());
}

function closeFinishedBlocks(side: SideOutline, sideName: Side, closingLine: string): void {
  while (finishedBlock(side)) {
    const block = side.open.pop()!;
    block.header[sideName] = withClosing(block.header[sideName], finishedBlock(side) ? '}' : closingLine);
  }
}

function finishedBlock(side: SideOutline): boolean {
  const innermost = side.open[side.open.length - 1];
  return innermost !== undefined && side.depth <= innermost.outerDepth;
}

function withClosing(cell: DiffCell | null, closing: string): DiffCell | null {
  return cell && { ...cell, text: `${cell.text.trimEnd()}${FOLD_GAP}${closing}` };
}

function copyCell(cell: DiffCell | null): DiffCell | null {
  return cell && { ...cell };
}

function declaresBlock(cell: DiffCell | null): boolean {
  return cell !== null && isDeclaration(cell.text);
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
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/\/\/.*$/, '')
    .replace(/\/(?:[^/\\[\n]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/g, '');
}

function count(text: string, character: string): number {
  return text.split(character).length - 1;
}
