import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';
import Textarea from './Textarea';
import Pagination from './Pagination';
import EmptyState from './EmptyState';
import { RatingLine, Stars, StarInput } from './StarRating';
import { useAuth } from '../context/AuthContext';
import { engageService } from '../services/engageService';

// Reviews are from BusinessHub accounts; we do not claim reviewers bought
// anything, because the platform cannot verify that.
export default function StoreReviews({ business, onSummary }) {
  const { user } = useAuth();
  const isOwn = user && String(user.business) === String(business._id);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [mine, setMine] = useState(null);
  const [form, setForm] = useState({ rating: 0, comment: '' });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = page) => {
    try { setData(await engageService.reviews(business._id, p)); } catch (e) { toast.error(e.message); }
    if (user && !isOwn) { try { setMine(await engageService.myReview(business._id)); } catch { /* not fatal */ } }
  }, [business._id, user, isOwn, page]);
  useEffect(() => { load(page); }, [load, page]);

  const afterWrite = (summary) => { onSummary?.(summary); setEditing(false); setForm({ rating: 0, comment: '' }); load(1); setPage(1); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) { toast.error('Please choose a star rating.'); return; }
    setSaving(true);
    try {
      const payload = { rating: form.rating, comment: form.comment };
      const summary = mine && editing ? await engageService.updateReview(mine._id, payload) : await engageService.createReview(business._id, payload);
      toast.success(editing ? 'Review updated.' : 'Thanks for your review!');
      afterWrite(summary);
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm('Delete your review?')) return;
    try { afterWrite(await engageService.deleteReview(mine._id)); setMine(null); toast.success('Review deleted.'); } catch (err) { toast.error(err.message); }
  };

  const showForm = user && !isOwn && (!mine || editing);
  return (
    <section className="mt-12" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 id="reviews-heading" className="text-lg font-semibold">Customer reviews</h2>
        <RatingLine average={business.ratingAverage} count={business.ratingCount} size={16} />
      </div>

      {!user && <p className="text-sm text-ink-500 mb-4"><Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Log in</Link> or <Link to="/register?type=buyer" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">create a free customer account</Link> to leave a review.</p>}
      {user && !isOwn && !user.emailVerified && !mine && (
        <p className="text-sm text-ink-500 mb-4">To keep reviews genuine, please <Link to={user.role === 'buyer' ? '/account/settings' : '/dashboard/settings'} className="text-brand-600 dark:text-brand-400 font-medium hover:underline">confirm your email</Link> before reviewing.</p>
      )}

      {mine && !editing && (
        <div className="card p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Your review{mine.status === 'hidden' ? ' (hidden by a moderator)' : ''}</p>
            <Stars value={mine.rating} size={16} />
            {mine.comment && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1 whitespace-pre-line">{mine.comment}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => { setForm({ rating: mine.rating, comment: mine.comment || '' }); setEditing(true); }}>Edit</button>
            <button className="btn-ghost text-sm text-red-600" onClick={remove}>Delete</button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="card p-4 mb-6 space-y-3">
          <p className="text-sm font-medium">{editing ? 'Edit your review' : 'Rate this business'}</p>
          <StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          <Textarea aria-label="Your review (optional)" rows={3} maxLength={1000} placeholder="Share your experience (optional)" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Save changes' : 'Submit review'}</button>
            {editing && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      )}

      {!data ? null : data.reviews.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No reviews yet" description="Be the first to share your experience with this business." />
      ) : (
        <>
          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r._id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm">{r.authorName}</span>
                  <span className="text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString()}{r.edited ? ' · edited' : ''}</span>
                </div>
                <Stars value={r.rating} size={14} />
                {r.comment && <p className="text-sm text-ink-600 dark:text-ink-400 mt-1.5 whitespace-pre-line break-words">{r.comment}</p>}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
