import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Store, CreditCard, Shield, MessageSquare, Star, BadgeCheck } from 'lucide-react';
import Logo from '../../components/Logo';
import SkipLink from '../../components/SkipLink';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/businesses', label: 'Businesses', icon: Store },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/verifications', label: 'Verification', icon: BadgeCheck },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      <SkipLink />
      <aside aria-label="Admin sidebar" className="w-64 border-r border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shrink-0 hidden lg:block">
        <div className="px-5 py-5 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
          <Logo />
          <Shield size={16} className="text-brand-600" />
        </div>
        <nav aria-label="Admin" className="p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
              }`}>
              <Icon size={18} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Phones and tablets: the sidebar is hidden, so show the same links as a scrollable bar. */}
        <header className="lg:hidden bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 sticky top-0 z-30">
          <div className="px-4 h-12 flex items-center justify-between">
            <Logo />
            <Shield size={16} className="text-brand-600" aria-hidden="true" />
          </div>
          <nav aria-label="Admin" className="px-3 pb-2 flex gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
                }`}>
                <Icon size={16} aria-hidden="true" /> {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none"><Outlet /></main>
      </div>
    </div>
  );
}
