import { Link } from "react-router-dom";

// BusinessHub brand colors
const COLORS = {
  ink: "#16211c", // dark tile
  gold: "#E8A33D", // storefront awning
  green: "#4F9E76", // growth line + arrowhead
};

// Storefront mark: a gold awning over a rising green growth line.
// Drawn entirely in code, so size and colors are controlled from here.
function Mark({ size = 32 }) {
  const line = {
    fill: "none",
    stroke: COLORS.green,
    strokeWidth: 2.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="8" fill={COLORS.ink} />
      {/* Awning with three scallops */}
      <path
        d="M6 7H26V10a3.33 3.33 0 0 1-6.67 0a3.33 3.33 0 0 1-6.66 0a3.33 3.33 0 0 1-6.67 0Z"
        fill={COLORS.gold}
      />
      {/* Growth line */}
      <path d="M8 25L13.5 20L17 23L23 17" {...line} />
      {/* Arrowhead */}
      <path d="M23 17H18M23 17V22" {...line} />
    </svg>
  );
}

export default function Logo({ to = "/", size = "md" }) {
  const textSizes = { sm: "text-base", md: "text-lg", lg: "text-2xl" };
  const markSizes = { sm: 26, md: 32, lg: 40 };

  return (
    <Link
      to={to}
      aria-label="BusinessHub home"
      className="flex items-center gap-2.5 font-semibold text-ink-900 dark:text-white shrink-0"
    >
      <Mark size={markSizes[size]} />
      <span className={`font-display ${textSizes[size]}`}>BusinessHub</span>
    </Link>
  );
}
