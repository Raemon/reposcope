'use client';

import { Component, type ReactNode } from 'react';
import { PaneStatusLine } from './PaneStatusLine';

// Without this, one render error in a column replaces the page with Next's error screen.
export class ColumnBoundary extends Component<{ children: ReactNode }, { failure: string | null }> {
  state = { failure: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { failure: error instanceof Error ? error.message : String(error) };
  }

  render() {
    const { failure } = this.state;
    if (failure === null) return this.props.children;
    return (
      <PaneStatusLine tone="error" onRetry={() => this.setState({ failure: null })}>
        This column hit an error: {failure}
      </PaneStatusLine>
    );
  }
}
