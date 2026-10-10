import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingCart, FileText, PackageX, Sparkles, Info } from 'lucide-react';
import { notificationService } from '../services/notificationService';

const ICONS = { order: ShoppingCart, invoice: FileText, inventory: PackageX, ai: Sparkles, system: Info };

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { notifications: n, unreadCount: c } = await notificationService.list({ limit: 15 });
      setNotifications(n);
      setUnreadCount(c);
    } catch {
      // silent — a failed notification fetch shouldn't disrupt the dashboard
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count periodically so the badge stays fresh without the
  // person needing to open the panel or reload the page.
  useEffect(() => {
    load();
    const interval = setInterval(load, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const handleClick = async (n) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationService.markRead(n._id).catch(() => {});
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllRead();
    } catch {
      load(); // resync on failure
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleOpen} className="relative p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300">
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card shadow-card-hover z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-ink-800 sticky top-0 bg-white dark:bg-ink-900">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:underline">Mark all read</button>
            )}
          </div>
          {loading && notifications.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-8">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-8">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-ink-50 dark:divide-ink-800/50">
              {notifications.map((n) => {
                const Icon = ICONS[n.type] || Info;
                return (
                  <li key={n._id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-ink-50 dark:hover:bg-ink-800/60 transition-colors ${!n.isRead ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-brand-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.message && <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{n.message}</p>}
                        <p className="text-[11px] text-ink-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-1.5" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
