import type { Metadata } from 'next';
import { Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import { CodebaseHeader } from '@/features/codebases/CodebaseHeader';
import { ThemeScript } from '@/features/theme/ThemeScript';
import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
});

export const metadata: Metadata = {
  title: 'reposcope — pull request viewer',
  description: 'Read the open pull requests of any repository straight from GitHub.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`h-full ${sourceSerif.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="h-full bg-bg font-mono text-ink">
        <div className="flex h-full flex-col">
          <CodebaseHeader />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
