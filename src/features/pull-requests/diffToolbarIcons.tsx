import type { ReactNode } from 'react';

function ToolbarIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SplitViewIcon() {
  return (
    <ToolbarIcon>
      <rect x="2.5" y="4" width="8" height="16" rx="1.5" />
      <rect x="13.5" y="4" width="8" height="16" rx="1.5" />
    </ToolbarIcon>
  );
}

export function UnifiedViewIcon() {
  return (
    <ToolbarIcon>
      <rect x="2.5" y="4" width="19" height="16" rx="1.5" />
      <path d="M6.5 9.5h11M6.5 14.5h7" />
    </ToolbarIcon>
  );
}

export function SmartFoldIcon() {
  return (
    <ToolbarIcon>
      <path d="M4 4.5h16M4 8.5h11" />
      <path d="M4 12.5h16" strokeDasharray="2.5 3" />
      <path d="M4 16.5h11M4 20.5h16" />
    </ToolbarIcon>
  );
}

export function ExpandAllIcon() {
  return (
    <ToolbarIcon>
      <path d="M3.5 4.5h17M3.5 19.5h17" />
      <path d="M8 10 12 6.5 16 10M8 14 12 17.5l4-3.5" />
    </ToolbarIcon>
  );
}

export function CollapseAllIcon() {
  return (
    <ToolbarIcon>
      <path d="M3.5 10.5h17M3.5 13.5h17" />
      <path d="M8 4 12 7.5 16 4M8 20 12 16.5l4 3.5" />
    </ToolbarIcon>
  );
}

export function GitHunksIcon() {
  return (
    <ToolbarIcon>
      <rect x="3" y="3.5" width="18" height="17" rx="2" />
      <path d="M11 6.5v5M8.5 9h5" />
      <path d="M8.5 15.5h5" />
    </ToolbarIcon>
  );
}

export function EditIcon() {
  return (
    <ToolbarIcon>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4Z" />
      <path d="M14.5 5.5l3 3" />
    </ToolbarIcon>
  );
}

export function SortIcon() {
  return (
    <ToolbarIcon>
      <path d="M7 20V4M3.5 7.5 7 4l3.5 3.5" />
      <path d="M17 4v16M13.5 16.5 17 20l3.5-3.5" />
    </ToolbarIcon>
  );
}
