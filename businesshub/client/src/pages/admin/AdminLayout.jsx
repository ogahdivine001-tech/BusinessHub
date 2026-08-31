import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Store, CreditCard, Shield } from 'lucide-react';
import Logo from '../../components/Logo';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/businesses', label: 'Businesses', icon: Store },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-64 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 hidden lg:block">
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Logo />
          <Shield size={16} className="text-brand-600" />
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto"><Outlet /></main>
    </div>
  );
}
