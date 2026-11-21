import { useEffect, useState } from 'react';
import useDialog from '../hooks/useDialog';
import SkipLink from '../components/SkipLink';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, Package, ShoppingCart, Users, FileText, Receipt,
  BarChart3, Sparkles, Megaphone, Settings, Menu, X, HelpCircle, ArrowUpCircle,
  Sun, Moon, LogOut, ExternalLink, Shield, Bell, BadgeCheck, HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import HelpModal from '../components/HelpModal';
import toast from 'react-hot-toast';
import { subscriptionService } from '../services/subscriptionService';
import { useUnread } from '../utils/unreadStore';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/business', label: 'My Business', icon: Store },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/invoices', label: 'Invoices', icon: FileText },
  { to: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/ai-assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/dashboard/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/dashboard/verification', label: 'Verification', icon: BadgeCheck },
  { to: '/account', label: 'Following & reviews', icon: HeartHandshake },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: true },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const unread = useUnread();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out.');
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-ink-100 dark:border-ink-800">
        <Logo to="/dashboard" />
      </div>
      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
            {badge && unread > 0 && (
              <span
                className="ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center"
                aria-label={`${unread} unread`}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-ink-100 dark:border-ink-800 space-y-1">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={() => setHelpOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800">
          <HelpCircle size={18} />
          Help
        </button>
        <NavLink to="/dashboard/settings?tab=Subscription" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20">
          <ArrowUpCircle size={18} />
          Upgrade plan
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/admin" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800">
            <Shield size={18} />
            Admin dashboard
          </NavLink>
        )}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.fullName?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-ink-500 truncate">{user?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} aria-label="Log out" title="Log out" className="-m-2 p-2 text-ink-500 hover:text-red-600">
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function TrialBanner() {
  const [trial, setTrial] = useState(null);
  const [renewal, setRenewal] = useState(null);

  useEffect(() => {
    subscriptionService.getMine().then((data) => { setTrial(data.trial); setRenewal({ ...data.renewal, plan: data.subscription?.plan }); }).catch(() => {});
  }, []);

  // Only nag once the trial is genuinely running low — showing this from
  // day one would just be noise. The trial is only 7 days long, so the
  // banner waits until the last 3 days.
  // A paid plan about to end, or one that just ended, gets the same kind of nudge.
  if (renewal?.state) {
    const ended = renewal.state === 'expired';
    return (
      <div className={`${ended ? 'bg-amber-600' : 'bg-brand-600'} text-white px-4 py-2 text-sm flex items-center justify-center gap-2 text-center`}>
        <Sparkles size={14} className="shrink-0" />
        <span>
          {ended ? `Your ${renewal.plan} plan has ended. Your data is safe.` : renewal.daysLeft <= 1 ? `Your ${renewal.plan} plan ends ${renewal.daysLeft === 0 ? 'today' : 'tomorrow'}.` : `Your ${renewal.plan} plan ends in ${renewal.daysLeft} days.`}
          {' '}
          <NavLink to="/dashboard/settings?tab=Subscription" className="underline font-medium">{ended ? 'Renew to get your tools back' : 'Renew now'}</NavLink>
        </span>
      </div>
    );
  }

  if (!trial?.active || trial.daysLeft > 3) return null;

  return (
    <div className="bg-brand-600 text-white px-4 py-2 text-sm flex items-center justify-center gap-2 text-center">
      <Sparkles size={14} className="shrink-0" />
      <span>
        {trial.daysLeft === 0 ? 'Your Pro trial ends today.' : `Your Pro trial ends in ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'}.`}
        {' '}
        <NavLink to="/dashboard/settings?tab=Subscription" className="underline font-medium">Upgrade to keep Pro features</NavLink>
      </span>
    </div>
  );
}

// Mobile navigation drawer. Mounted only while open, so the dialog behaviour
// (Escape, focus trap, focus return, scroll lock) is active exactly then.
function MobileDrawer({ onClose }) {
  const ref = useDialog(true, onClose);
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        className="absolute inset-0 w-full h-full bg-black/40 cursor-default"
        onClick={onClose}
      />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] overflow-y-auto bg-white dark:bg-ink-900 shadow-xl outline-none"
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen h-dvh bg-ink-50 dark:bg-ink-950">
      <SkipLink />
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 border-r border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && <MobileDrawer onClose={() => setMobileOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="-m-2 p-2 text-ink-600 dark:text-ink-300"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Logo to="/dashboard" size="sm" />
          <NotificationBell />
        </header>

        {/* Desktop top bar — sidebar already shows the logo, so this is just
            for the notification bell and stays out of the way otherwise. */}
        <header className="hidden lg:flex items-center justify-end px-6 h-14 border-b border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shrink-0">
          <NotificationBell />
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <TrialBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
