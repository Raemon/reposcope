// fill-box: paths scale about their own centre, not the viewBox's, so they pulse in place.
const SPARKLE = 'animate-sparkle origin-center [transform-box:fill-box]';

export function SparkleIcon({ size = 12, label, className = '' }: { size?: number; label?: string; className?: string }) {
  const aria = label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={`shrink-0 ${className}`} {...aria}>
      <path className={SPARKLE} d="M10 3c.6 5 2.6 7 7.5 7.5C12.6 11 10.6 13 10 18c-.6-5-2.6-7-7.5-7.5C7.4 10 9.4 8 10 3Z" />
      <path className={`${SPARKLE} [animation-delay:-0.7s]`} d="M18 14c.3 2.4 1.3 3.4 3.5 3.5-2.2.3-3.2 1.3-3.5 3.5-.3-2.2-1.3-3.2-3.5-3.5 2.2-.1 3.2-1.1 3.5-3.5Z" />
    </svg>
  );
}
