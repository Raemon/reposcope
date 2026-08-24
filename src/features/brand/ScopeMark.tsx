export function ScopeMark({ size = 64, title }: { size?: number; title?: string }) {
  return (
    <svg
      viewBox="-32 -32 128 128"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? 'Shoggoth Reviews'}
      className="text-scope"
    >
      <circle cx="27" cy="27" r="18" className="fill-scope-lens" />
      <path d="M40 40 L55 55" stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="27" cy="27" r="18" stroke="currentColor" strokeWidth="5" fill="none" />
      <path
        d="M23 20 L15 27 L23 34 M31 20 L39 27 L31 34"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
