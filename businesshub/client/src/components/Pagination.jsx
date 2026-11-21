import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, onPageChange }) {
  if (!pages || pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between mt-5 pt-4 border-t border-ink-100 dark:border-ink-800">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="btn-secondary text-sm py-2.5 sm:py-1.5 px-3 disabled:opacity-40"
      >
        <ChevronLeft size={14} aria-hidden="true" /> Previous
      </button>
      <span className="text-sm text-ink-500" aria-live="polite" aria-atomic="true">Page {page} of {pages}</span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        className="btn-secondary text-sm py-2.5 sm:py-1.5 px-3 disabled:opacity-40"
      >
        Next <ChevronRight size={14} aria-hidden="true" />
      </button>
    </nav>
  );
}
