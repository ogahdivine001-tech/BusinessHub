import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Compass, HeartHandshake, HelpCircle, LayoutDashboard, LogOut, MessageSquareText, Moon, Settings, ShoppingBag, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';
import SkipLink from '../components/SkipLink';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'My orders', icon: ShoppingBag },
  { to: '/account/following', label: 'Following', icon: HeartHandshake },
  { to: '/account/reviews', label: 'My reviews', icon: MessageSquareText },
  { to: '/account/notifications', label: 'Notifications', icon: Bell },
  { to: '/account/settings', label: 'Settings', icon: Settings },
];

// The customer area: a simple top bar, built for phones first.
export default function AccountLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isSeller = user?.role !== 'buyer';

  const handleLogout = async () => { await logout(); toast.success('Logged out.'); navigate('/login'); };
  const tabClass = ({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'}`;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <SkipLink />
      <header className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Logo to="/account" />
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/discover" className="btn-ghost text-sm"><Compass size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Discover</span></NavLink>
            <NavLink to="/help" className="btn-ghost text-sm"><HelpCircle size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Help</span></NavLink>
            {isSeller && <NavLink to="/dashboard" className="btn-ghost text-sm"><LayoutDashboard size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Seller dashboard</span></NavLink>}
            <NotificationBell />
            <button type="button" onClick={toggleTheme} className="btn-ghost" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</button>
            <button type="button" onClick={handleLogout} className="btn-ghost" aria-label="Log out" title="Log out"><LogOut size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <nav aria-label="Your account" className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={tabClass}><Icon size={16} />{label}</NavLink>)}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="max-w-5xl mx-auto px-4 py-6 sm:py-8 outline-none"><Outlet /></main>
    </div>
  );
}
