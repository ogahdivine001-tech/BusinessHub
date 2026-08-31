import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Logo({ to = '/', size = 'md' }) {
  const sizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };
  return (
    <Link to={to} className="flex items-center gap-2 font-bold text-gray-900 dark:text-white shrink-0">
      <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
        <Zap size={16} className="text-white" fill="white" />
      </span>
      <span className={sizes[size]}>BusinessHub</span>
    </Link>
  );
}
