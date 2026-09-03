'use client';

import { useState } from 'react';
import { useShowsColumn } from './centralLayout';
import { ColumnPreview, type PreviewToken } from './ColumnPreview';
import { useRegisterColumn } from './columnNav';
import { rowKey } from './fileTreeNodes';
import { RepoBrowseReader } from './RepoBrowseReader';
import { RepoFileList } from './RepoFileList';
import { RepoPullsColumn } from './PullListColumn';
import { useRepoFiles } from './repoFileStore';
import { ResizableColumn, useCollapsibleColumn } from './ResizableColumn';
import { useStickyColumn } from './stickyColumns';
import { useRepoFileTree, type RepoFileTree } from './useRepoFileTree';

export function RepoFilesBrowser({ owner, repo }: { owner: string; repo: string }) {
  const [pullSize, setPullSize] = useStickyColumn('repo-pulls');
  const [fileSize, setFileSize] = useStickyColumn('repo-files');
  const [browsed, setBrowsed] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const repoFiles = useRepoFiles(owner, repo, true);
  const tree = useRepoFileTree({ repoFiles, query, selected: browsed, onSelect: setBrowsed });
  useRegisterColumn(
    'files',
    {
      ...useCollapsibleColumn(fileSize, setFileSize),
      items: tree.navItems,
      selected: browsed,
      onSelect: tree.selectItem,
      onActivate: tree.activateItem,
    },
    useShowsColumn('files'),
  );
  const fileSet = repoFiles.fileSet;
  return (
    <div className="flex min-h-0 flex-1 max-md:flex-col max-md:overflow-y-auto">
      <RepoPullsColumn
        owner={owner}
        repo={repo}
        note="most recently updated first"
        size={pullSize}
        onSize={setPullSize}
      />
      <ResizableColumn
        navId="files"
        icon="▤"
        title="all files"
        tone="bg-shade"
        preview={<ColumnPreview column="files" tokens={treeTokens(tree, browsed)} />}
        size={fileSize}
        onSize={setFileSize}
      >
        <RepoFileList
          repoFiles={repoFiles}
          tree={tree}
          selected={browsed}
          onSelect={setBrowsed}
          query={query}
          onQuery={setQuery}
        />
      </ResizableColumn>
      <div className="flex min-w-0 flex-1 flex-col max-md:h-[80vh] max-md:flex-none">
        {browsed !== null && fileSet !== null ? (
          <RepoBrowseReader owner={owner} repo={repo} fileSet={fileSet} tree={tree} item={browsed} />
        ) : (
          <p className="px-2 py-1 text-[11px] text-ink-dim">Pick a file or folder to read it here.</p>
        )}
      </div>
    </div>
  );
}

function treeTokens(tree: RepoFileTree, selected: string | null): PreviewToken[] {
  return tree.rows.map((row) => ({
    key: rowKey(row),
    label: row.node.name.slice(0, 2),
    title: row.node.path,
    accent: rowKey(row) === selected,
    serif: true,
  }));
}
