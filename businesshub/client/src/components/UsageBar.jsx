import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shows "used / limit" for a plan-limited resource (products, invoices, AI
// requests, etc). Renders as unlimited when the plan has no cap (Infinity),
// and turns amber/red as the user approaches or hits the limit so the
// upgrade prompt appears before they hit a wall, not just after.
export default function UsageBar({ label, used, limit }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const atLimit = !unlimited && used >= limit;
  const near = !unlimited && !atLimit && pct >= 80;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className={atLimit ? 'text-red-600 font-medium' : near ? 'text-amber-600 font-medium' : 'text-gray-500'}>
          {unlimited ? `${used} used · Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {atLimit && (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
          <Lock size={12} /> Limit reached —{' '}
          <Link to="/dashboard/settings?tab=Subscription" className="underline font-medium">upgrade your plan</Link> to add more.
        </p>
      )}
    </div>
  );
}
