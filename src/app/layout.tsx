import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CodebaseSidebar } from '@/features/codebases/CodebaseSidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'apiscope — codebase viewer',
  description: 'Read the server boundary of any repository straight from GitHub.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-bg font-mono text-ink">
        <div className="flex h-full">
          <CodebaseSidebar />
          <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
