'use client';

import { FileTreeRow } from './FileTreeRow';
import { browseKey } from './fileTreeNodes';
import { FolderTreeRow } from './FolderTreeRow';
import type { RepoFileTree } from './useRepoFileTree';

const STEP = 10;
const BASE = 6;

export function RepoFileTreeRows({
  tree,
  selected,
  onSelect,
}: {
  tree: RepoFileTree;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  return tree.rows.map(({ node, depth }) =>
    node.kind === 'folder' ? (
      <FolderTreeRow
        key={node.path}
        path={node.path}
        name={node.name}
        indent={indentOf(depth)}
        open={tree.isOpen(node.path)}
        onToggle={() => tree.toggle(node.path)}
      />
    ) : (
      <FileTreeRow
        key={node.path}
        path={node.path}
        navKey={browseKey(node.path)}
        selected={node.path === selected}
        onSelect={() => onSelect(node.path)}
        indent={indentOf(depth) + STEP}
      />
    ),
  );
}

function indentOf(depth: number): number {
  return BASE + depth * STEP;
}
