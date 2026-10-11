import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell, ShoppingCart, FileText, PackageX, Sparkles, Info,
  Pin, PinOff, Trash2, ExternalLink, CheckCheck, Eraser,
} from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import { CardSkeleton } from '../../components/Skeleton';
import { notificationService } from '../../services/notificationService';

const ICONS = { order: ShoppingCart, invoice: FileText, inventory: PackageX, ai: Sparkles, system: Info };
const TYPE_LABELS = { order: 'Order', invoice: 'Invoice', inventory: 'Stock', ai: 'AI', system: 'Message' };
const FILTERS = [['all', 'All'], ['unread', 'Unread'], ['pinned', 'Pinned']];
const EMPTY = {
  all: ['No notifications yet', 'Updates about your orders, invoices, stock and messages from the BusinessHub team will appear here.'],
  unread: ["You're all caught up", 'There is nothing new to read.'],
  pinned: ['Nothing pinned', 'Pin a notification to keep it at the top of this page.'],
};

// Tells the bell in the header to refresh its count and list.
const tellBell = () => window.dispatchEvent(new Event('notifications:changed'));

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ notifications: [], total: 0, unreadCount: 0, pinnedCount: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // { kind: 'one', id, title } | { kind: 'clear' }
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await notificationService.list({ filter, page, limit: 20 });
      setData(d);
      // Deleting the last item on the final page: step back one page.
      if (d.pages > 0 && d.page > d.pages) setPage(d.pages);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const markRead = async (n) => {
    if (n.isRead) return;
    setData((d) => ({
      ...d,
      unreadCount: Math.max(0, d.unreadCount - 1),
      notifications: d.notifications.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)),
    }));
    try { await notificationService.markRead(n._id); tellBell(); } catch { /* the list refreshes on the next load */ }
  };

  const markAllRead = async () => {
    try { await notificationService.markAllRead(); tellBell(); await load(); toast.success('All marked as read.'); }
    catch (err) { toast.error(err.message); }
  };

  const togglePin = async (n) => {
    try {
      await notificationService.pin(n._id, !n.isPinned);
      toast.success(n.isPinned ? 'Unpinned.' : 'Pinned to the top.');
      tellBell(); await load();
    } catch (err) { toast.error(err.message); }
  };

  const openLink = (n) => { markRead(n); navigate(n.link); };

  const runConfirmed = async () => {
    setWorking(true);
    try {
      if (confirm.kind === 'one') {
        await notificationService.remove(confirm.id);
        toast.success('Notification deleted.');
      } else {
        const { deleted } = await notificationService.clearRead();
        toast.success(deleted === 1 ? '1 notification cleared.' : `${deleted} notifications cleared.`);
      }
      setConfirm(null); tellBell(); await load();
    } catch (err) { toast.error(err.message); }
    finally { setWorking(false); }
  };

  const iconBtn = 'p-2 rounded-lg text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors';
  const [emptyTitle, emptyText] = EMPTY[filter];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
            {data.unreadCount > 0 ? `${data.unreadCount} unread` : 'Everything is read'}
            {data.pinnedCount > 0 ? ` · ${data.pinnedCount} pinned` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead} disabled={data.unreadCount === 0} className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            <CheckCheck size={15} /> Mark all read
          </button>
          <button onClick={() => setConfirm({ kind: 'clear' })} className="btn-secondary text-sm">
            <Eraser size={15} /> Clear read
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5" role="tablist" aria-label="Filter notifications">
        {FILTERS.map(([key, label]) => (
          <button
            key={key} role="tab" aria-selected={filter === key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === key
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800'
            }`}
          >
            {label}
            {key === 'unread' && data.unreadCount > 0 ? ` (${data.unreadCount})` : ''}
            {key === 'pinned' && data.pinnedCount > 0 ? ` (${data.pinnedCount})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : data.notifications.length === 0 ? (
        <div className="card"><EmptyState icon={Bell} title={emptyTitle} description={emptyText} /></div>
      ) : (
        <ul className="space-y-3">
          {data.notifications.map((n) => {
            const Icon = ICONS[n.type] || Info;
            return (
              <li key={n._id}>
                <article className={`card p-4 sm:p-5 flex gap-3 sm:gap-4 ${!n.isRead ? 'ring-1 ring-brand-200 dark:ring-brand-800 bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-brand-600 dark:text-brand-400" />
                  </div>

                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => markRead(n)}>
                    <div className="flex items-start gap-2">
                      <h2 className={`text-sm sm:text-base break-words ${n.isRead ? 'font-medium' : 'font-semibold'}`}>{n.title}</h2>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 mt-2" aria-label="Unread" />}
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span>{TYPE_LABELS[n.type] || 'Message'}</span>
                      <span aria-hidden>·</span>
                      <span title={new Date(n.createdAt).toLocaleString()}>{timeAgo(n.createdAt)}</span>
                      {n.isPinned && (
                        <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 font-medium"><Pin size={11} /> Pinned</span>
                      )}
                    </p>
                    {n.message && (
                      <p className="text-sm text-ink-700 dark:text-ink-300 mt-2 whitespace-pre-wrap break-words">{n.message}</p>
                    )}
                    {n.link && (
                      <button onClick={(e) => { e.stopPropagation(); openLink(n); }} className="mt-3 text-sm font-medium text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1">
                        Open <ExternalLink size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-0.5 shrink-0 self-start">
                    <button onClick={() => togglePin(n)} className={iconBtn} aria-label={n.isPinned ? 'Unpin notification' : 'Pin notification'} title={n.isPinned ? 'Unpin' : 'Pin to top'}>
                      {n.isPinned ? <PinOff size={17} /> : <Pin size={17} />}
                    </button>
                    <button onClick={() => setConfirm({ kind: 'one', id: n._id, title: n.title })} className={`${iconBtn} hover:text-red-600 dark:hover:text-red-400`} aria-label="Delete notification" title="Delete">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={data.page || page} pages={data.pages} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === 'clear' ? 'Clear read notifications?' : 'Delete this notification?'}
        description={confirm?.kind === 'clear'
          ? 'All read notifications will be deleted. Unread and pinned ones are kept. This cannot be undone.'
          : `"${confirm?.title || ''}" will be deleted. This cannot be undone.`}
        confirmLabel={confirm?.kind === 'clear' ? 'Clear read' : 'Delete'}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
        loading={working}
      />
    </div>
  );
}
