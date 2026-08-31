import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open, title = 'Are you sure?', description, confirmLabel = 'Confirm',
  danger = true, onConfirm, onCancel, loading = false,
}) {
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
            className="card w-full max-w-sm p-6"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-brand-50 dark:bg-brand-900/20'}`}>
                <AlertTriangle size={20} className={danger ? 'text-red-600' : 'text-brand-600'} />
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
            {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
              <button
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
