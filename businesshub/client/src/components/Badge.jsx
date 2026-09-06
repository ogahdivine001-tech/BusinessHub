const COLORS = {
  gray: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
};

export default function Badge({ children, color = 'gray' }) {
  return <span className={`badge ${COLORS[color] || COLORS.gray}`}>{children}</span>;
}
