import type { Command } from './commandRegistry';

export type CommandGroup = 'Palette' | 'Go' | 'Pull request' | 'Navigate' | 'Columns' | 'Files' | 'Diff' | 'Folds' | 'Sort' | 'Pull list' | 'View';

interface Binding {
  group: CommandGroup;
  keys: readonly string[];
}

// 'g h' is a two-chord sequence; 'mod' is ⌘ on a Mac, Ctrl elsewhere; [] means palette-only.
export const KEYBINDINGS = {
  'palette.open': { group: 'Palette', keys: ['mod+k'] },
  'palette.commands': { group: 'Palette', keys: ['mod+shift+p', '?', '>'] },
  'palette.repos': { group: 'Palette', keys: ['@'] },
  'palette.pulls': { group: 'Palette', keys: ['#'] },
  'palette.files': { group: 'Palette', keys: ['/'] },
  'palette.commits': { group: 'Palette', keys: [':'] },
  'palette.branches': { group: 'Palette', keys: ['~'] },
  'go.home': { group: 'Go', keys: ['g h'] },
  'go.allPulls': { group: 'Go', keys: ['g p'] },
  'go.repo': { group: 'Go', keys: ['g r'] },
  'go.github': { group: 'Go', keys: ['g g'] },
  'pull.prev': { group: 'Pull request', keys: ['[', 'alt+['] },
  'pull.next': { group: 'Pull request', keys: [']', 'alt+]'] },
  'pull.reload': { group: 'Pull request', keys: ['r'] },
  'pull.copyLink': { group: 'Pull request', keys: ['y'] },
  'pull.merge': { group: 'Pull request', keys: [] },
  'pull.close': { group: 'Pull request', keys: [] },
  'nav.left': { group: 'Navigate', keys: ['ArrowLeft', 'h'] },
  'nav.right': { group: 'Navigate', keys: ['ArrowRight', 'l'] },
  'nav.up': { group: 'Navigate', keys: ['ArrowUp', 'k'] },
  'nav.down': { group: 'Navigate', keys: ['ArrowDown', 'j'] },
  'nav.activate': { group: 'Navigate', keys: ['Enter'] },
  'nav.escape': { group: 'Navigate', keys: ['Escape'] },
  'column.toggle': { group: 'Columns', keys: ['-'] },
  'column.pulls': { group: 'Columns', keys: ['g 1', 'alt+1'] },
  'column.discussion': { group: 'Columns', keys: ['g 2', 'alt+2'] },
  'column.commits': { group: 'Columns', keys: ['g 3', 'alt+3'] },
  'column.files': { group: 'Columns', keys: ['g 4', 'alt+4'] },
  'column.diff': { group: 'Columns', keys: ['g 5', 'alt+5'] },
  'column.aiChat': { group: 'Columns', keys: ['g 6', 'alt+6'] },
  'file.prev': { group: 'Files', keys: ['p'] },
  'file.next': { group: 'Files', keys: ['n'] },
  'diff.split': { group: 'Diff', keys: ['1'] },
  'diff.unified': { group: 'Diff', keys: ['2'] },
  'diff.result': { group: 'Diff', keys: ['3'] },
  'diff.editMode': { group: 'Diff', keys: ['e'] },
  'fold.default': { group: 'Folds', keys: ['z d'] },
  'fold.expandAll': { group: 'Folds', keys: ['z e'] },
  'fold.collapseExceptTypes': { group: 'Folds', keys: ['z t'] },
  'fold.collapseHidingComments': { group: 'Folds', keys: ['z h'] },
  'fold.collapseExceptComments': { group: 'Folds', keys: ['z c'] },
  'fold.gitDefault': { group: 'Folds', keys: ['z g'] },
  'sort.comments': { group: 'Sort', keys: ['s c'] },
  'sort.diff': { group: 'Sort', keys: ['s d'] },
  'sort.diffAll': { group: 'Sort', keys: ['s a'] },
  'sort.folder': { group: 'Sort', keys: ['s f'] },
  'filter.open': { group: 'Pull list', keys: ['f o'] },
  'filter.closed': { group: 'Pull list', keys: ['f c'] },
  'filter.all': { group: 'Pull list', keys: ['f a'] },
  'filter.author': { group: 'Pull list', keys: ['f m'] },
  'view.toggle': { group: 'View', keys: ['v'] },
  'theme.toggle': { group: 'View', keys: ['t'] },
} as const satisfies Record<string, Binding>;

export type CommandId = keyof typeof KEYBINDINGS;

export function command(id: CommandId, title: string, run: () => void, detail?: string): Command {
  const { group, keys } = KEYBINDINGS[id];
  return { id, title, group, keys: [...keys], detail, run };
}
