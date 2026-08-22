'use client';

export function FilterField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mb-2 w-64 rounded border border-btn-edge bg-field px-2 py-1 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent"
    />
  );
}

export function matchesFilter(filter: string, ...haystacks: (string | undefined)[]): boolean {
  const needle = filter.trim().toLowerCase();
  if (needle === '') return true;
  return haystacks.some((held) => held !== undefined && held.toLowerCase().includes(needle));
}
