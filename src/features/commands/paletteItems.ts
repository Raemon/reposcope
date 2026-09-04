import { fuzzyMatch } from './fuzzy';
import { PALETTE_KINDS, parsePaletteQuery, type PaletteKind } from './paletteQuery';

export interface PaletteItem {
  key: string;
  kind: PaletteKind;
  title: string;
  detail?: string;
  keys?: string[];
  scope?: PaletteScope;
  run: () => void;
}

export type PaletteScope =
  | { kind: 'repo'; owner: string; name: string }
  | { kind: 'pull'; owner: string; repo: string; number: number; title: string }
  | { kind: 'branch'; owner: string; repo: string; name: string };

export interface PaletteHit {
  item: PaletteItem;
  score: number;
  titlePositions: number[];
  detailPositions: number[];
}

// DETAIL_GAP spaces join title and detail; positions past the split map back into detail.
const DETAIL_GAP = 2;
export const MAX_HITS = 80;

export function rankPaletteItems(raw: string, items: PaletteItem[], caps: Partial<Record<PaletteKind, number>>): PaletteHit[] {
  const query = parsePaletteQuery(raw);
  const pool = query.kind === null ? items : items.filter((item) => item.kind === query.kind);
  if (query.text === '') return browseHits(pool, caps);
  return pool
    .flatMap((item) => hitFor(query.text, item))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HITS);
}

function browseHits(pool: PaletteItem[], caps: Partial<Record<PaletteKind, number>>): PaletteHit[] {
  return PALETTE_KINDS.flatMap((kind) =>
    pool
      .filter((item) => item.kind === kind)
      .slice(0, caps[kind] ?? Infinity)
      .map((item) => ({ item, score: 0, titlePositions: [], detailPositions: [] })),
  );
}

function hitFor(text: string, item: PaletteItem): PaletteHit[] {
  const match = fuzzyMatch(text, haystackOf(item));
  if (!match) return [];
  const split = item.title.length + DETAIL_GAP;
  return [
    {
      item,
      score: match.score,
      titlePositions: match.positions.filter((at) => at < item.title.length),
      detailPositions: match.positions.filter((at) => at >= split).map((at) => at - split),
    },
  ];
}

function haystackOf(item: PaletteItem): string {
  return item.detail ? `${item.title}${' '.repeat(DETAIL_GAP)}${item.detail}` : item.title;
}
