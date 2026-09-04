'use client';

import { FileTreeRow } from './FileTreeRow';
import { browseKey, folderKey } from './fileTreeNodes';
import { FolderTreeRow } from './FolderTreeRow';
import { LineCount } from './LineCount';
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
  onSelect: (item: string) => void;
}) {
  return tree.rows.map(({ node, depth }) =>
    node.kind === 'folder' ? (
      <FolderTreeRow
        key={node.path}
        path={node.path}
        name={node.name}
        indent={indentOf(depth)}
        open={tree.isOpen(node.path)}
        selected={folderKey(node.path) === selected}
        onActivate={() => tree.activateItem(folderKey(node.path))}
      >
        <LineCount lines={tree.lines.get(node.path)} />
      </FolderTreeRow>
    ) : (
      <FileTreeRow
        key={node.path}
        path={node.path}
        navKey={browseKey(node.path)}
        selected={browseKey(node.path) === selected}
        onSelect={() => onSelect(browseKey(node.path))}
        indent={indentOf(depth) + STEP}
      >
        <LineCount lines={tree.lines.get(node.path)} />
      </FileTreeRow>
    ),
  );
}

function indentOf(depth: number): number {
  return BASE + depth * STEP;
}
