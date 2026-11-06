import { BadgeCheck } from 'lucide-react';

// Shown only when an administrator has verified the business. Never a self-service badge.
export default function VerifiedBadge({ status, size = 16 }) {
  if (status !== 'verified') return null;
  return (
    <span title="Verified by BusinessHub" aria-label="Verified business" className="inline-flex text-brand-600 dark:text-brand-400">
      <BadgeCheck size={size} />
    </span>
  );
}
