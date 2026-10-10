export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
          <Icon size={26} className="text-brand-600" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100">{title}</h3>
      {description && (
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
