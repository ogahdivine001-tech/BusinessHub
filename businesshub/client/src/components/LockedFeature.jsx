import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Card from './Card';

// Shown instead of a tool the current plan does not include. The server also
// refuses these requests, so this is a friendly explanation, not the protection.
export default function LockedFeature({ title, description, plans = 'Starter and Pro' }) {
  return (
    <Card className="p-8 text-center max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mx-auto">
        <Lock size={20} className="text-brand-600" />
      </div>
      <h2 className="text-lg font-semibold mt-4">{title}</h2>
      <p className="text-ink-500 text-sm mt-2">{description}</p>
      <p className="text-ink-500 text-sm mt-1">Included in the {plans} plans.</p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <Link to="/dashboard/settings?tab=Subscription" className="btn-primary">See plans</Link>
        <Link to="/help" className="btn-secondary">Browse the Help Center</Link>
      </div>
    </Card>
  );
}
