'use client';

import { Component, type ReactNode } from 'react';

// Without this, one render error anywhere in a column replaces the whole page with Next.js's error screen.
export class ColumnBoundary extends Component<{ children: ReactNode }, { failure: string | null }> {
  state = { failure: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { failure: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.failure === null) return this.props.children;
    return <Failed message={this.state.failure} onRetry={() => this.setState({ failure: null })} />;
  }
}

function Failed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-1.5 py-1 text-[10px] leading-4 text-error-ink">
      <p>This column hit an error: {message}</p>
      <button type="button" onClick={onRetry} className="mt-1 underline">
        try again
      </button>
    </div>
  );
}
