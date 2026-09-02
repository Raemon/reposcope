import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CodebaseHeader } from '@/features/codebases/CodebaseHeader';
import { DEFAULT_TITLE, DocumentTitle } from '@/features/codebases/DocumentTitle';
import { ThemeScript } from '@/features/theme/ThemeScript';
import './globals.css';

export const metadata: Metadata = {
  description: 'Read the open pull requests of any repository straight from GitHub.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <title>{DEFAULT_TITLE}</title>
        <ThemeScript />
      </head>
      <body className="h-full bg-bg font-mono text-ink">
        <DocumentTitle />
        <div className="flex h-full flex-col">
          <CodebaseHeader />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
