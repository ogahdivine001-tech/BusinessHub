import { Link } from 'react-router-dom';

// A simple two-tone growth mark — gold trend line meeting a green
// arrowhead — on a dark ink chip. Tied to what BusinessHub actually does
// (helping a business grow) rather than a generic icon-in-a-box.
function Mark({ size = 32 }) {
  return (
    <span
      className="rounded-xl bg-ink-950 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <path d="M3 16.5L9.5 10L13.5 14L21 6.5" stroke="#E8A33D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 6.5H14.5M21 6.5V13" stroke="#4F9E76" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function Logo({ to = '/', size = 'md' }) {
  const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };
  const markSizes = { sm: 26, md: 32, lg: 40 };
  return (
    <Link to={to} className="flex items-center gap-2.5 font-semibold text-ink-900 dark:text-white shrink-0">
      <Mark size={markSizes[size]} />
      <span className={`font-display ${textSizes[size]}`}>BusinessHub</span>
    </Link>
  );
}
