'use client';

import { setTheme, useTheme } from './themeStore';

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      className="shrink-0 rounded border border-btn-edge px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-dim hover:bg-btn-hover hover:text-ink"
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}
