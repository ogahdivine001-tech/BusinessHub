import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import useDialog from '../hooks/useDialog';

export default function ConfirmDialog({
  open, title = 'Are you sure?', description, confirmLabel = 'Confirm',
  danger = true, onConfirm, onCancel, loading = false,
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useDialog(open, onCancel);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className="card w-full max-w-sm p-6 outline-none"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-brand-50 dark:bg-brand-900/20'}`}>
                <AlertTriangle size={20} aria-hidden="true" className={danger ? 'text-red-600' : 'text-brand-600'} />
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close dialog"
                className="-m-2 p-2 rounded-lg text-ink-500 hover:text-ink-700 dark:hover:text-ink-200"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <h3 id={titleId} className="text-base font-semibold">{title}</h3>
            {description && <p id={descId} className="text-sm text-ink-500 dark:text-ink-400 mt-1.5">{description}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" data-autofocus onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
              >
                {loading ? 'Please wait…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
