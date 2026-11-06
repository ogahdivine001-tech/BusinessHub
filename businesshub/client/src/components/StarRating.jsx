import { Star } from 'lucide-react';

// Read-only stars. Never shown without real data: callers use <RatingLine />,
// which says "No reviews yet" instead of drawing an empty or invented rating.
export function Stars({ value = 0, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold-500" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={value >= n - 0.25 ? 'fill-current' : 'text-ink-300 dark:text-ink-600'} />
      ))}
    </span>
  );
}

export function RatingLine({ average, count, size = 14 }) {
  if (!count) return <span className="text-xs text-ink-500">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" title={`${average} out of 5 from ${count} review${count === 1 ? '' : 's'}`}>
      <Stars value={average} size={size} />
      <span className="font-semibold text-ink-800 dark:text-ink-100">{Number(average).toFixed(1)}</span>
      <span className="text-ink-500">({count} review{count === 1 ? '' : 's'})</span>
    </span>
  );
}

// Clickable 1-5 star picker (keyboard accessible: it is a radio group).
export function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="inline-flex items-center gap-1 text-gold-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)} className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Star size={26} className={value >= n ? 'fill-current' : 'text-ink-300 dark:text-ink-600'} />
        </button>
      ))}
    </div>
  );
}
