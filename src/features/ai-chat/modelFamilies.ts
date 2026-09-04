import type { CursorModel } from './cursorTypes';

export interface ModelFamily {
  key: string;
  label: string;
  match: RegExp;
}

export const DEFAULT_FAMILY: ModelFamily = { key: 'composer', label: 'Composer', match: /composer/i };

export const MODEL_FAMILIES: ModelFamily[] = [
  DEFAULT_FAMILY,
  { key: 'opus', label: 'Claude Opus', match: /opus/i },
  { key: 'fable', label: 'Claude Fable', match: /fable/i },
];

export function latestModel(models: CursorModel[], family: ModelFamily): CursorModel | null {
  const offered = models.filter((model) => family.match.test(model.id) || family.match.test(model.displayName));
  return offered.sort(newestPlainFirst)[0] ?? null;
}

// Same version: shorter id is the plain model, ahead of -thinking / -max variants.
function newestPlainFirst(a: CursorModel, b: CursorModel): number {
  return versionOf(b.id) - versionOf(a.id) || a.id.length - b.id.length;
}

function versionOf(id: string): number {
  const found = /\d+(?:\.\d+)?/.exec(id);
  return found ? Number(found[0]) : 0;
}
