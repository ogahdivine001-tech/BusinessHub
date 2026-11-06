import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Compass, HeartHandshake, HelpCircle, LayoutDashboard, LogOut, MessageSquareText, Moon, Settings, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { to: '/account', label: 'Overview', icon: LayoutDashboard, end: true },
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
      <header className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Logo to="/account" />
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/discover" className="btn-ghost text-sm"><Compass size={16} /><span className="hidden sm:inline">Discover</span></NavLink>
            <NavLink to="/help" className="btn-ghost text-sm"><HelpCircle size={16} /><span className="hidden sm:inline">Help</span></NavLink>
            {isSeller && <NavLink to="/dashboard" className="btn-ghost text-sm"><LayoutDashboard size={16} /><span className="hidden sm:inline">Seller dashboard</span></NavLink>}
            <NotificationBell />
            <button onClick={toggleTheme} className="btn-ghost" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={handleLogout} className="btn-ghost" aria-label="Log out" title="Log out"><LogOut size={16} /></button>
          </div>
        </div>
        <nav aria-label="Your account" className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={tabClass}><Icon size={16} />{label}</NavLink>)}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8"><Outlet /></main>
    </div>
  );
}
