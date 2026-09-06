import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, change, icon: Icon, prefix = '' }) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-ink-500 dark:text-ink-400">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
            <Icon size={16} className="text-brand-600" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-ink-900 dark:text-ink-50">
        {prefix}
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change)}% vs previous period
        </div>
      )}
    </div>
  );
}
