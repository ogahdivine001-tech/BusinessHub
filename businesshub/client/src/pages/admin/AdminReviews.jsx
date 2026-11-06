import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import Textarea from '../../components/Textarea';
import Pagination from '../../components/Pagination';
import { Stars } from '../../components/StarRating';
import { TableSkeleton } from '../../components/Skeleton';
import { adminService } from '../../services/adminService';

// Hiding a review needs a written reason; every decision is recorded in the audit log.
export default function AdminReviews() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminService.reviews({ status: status || undefined, page }).then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [status, page]);
  useEffect(load, [load]);

  const decide = async (review, next, why) => {
    setSaving(true);
    try {
      await adminService.moderateReview(review._id, next, why);
      toast.success(next === 'hidden' ? 'Review hidden.' : 'Review restored.');
      setTarget(null); setReason(''); load();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <div className="w-44"><Select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All reviews</option><option value="published">Published</option><option value="hidden">Hidden</option>
        </Select></div>
      </div>
      <Card className="p-5">
        {loading ? <TableSkeleton rows={6} /> : !data?.reviews.length ? <p className="text-sm text-ink-500 py-6 text-center">No reviews to show.</p> : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                {['Business', 'Reviewer', 'Rating', 'Review', 'Status', ''].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0 align-top">
                    <td className="px-5 py-3 font-medium">{r.business?.name || '—'}</td>
                    <td className="px-5 py-3"><div>{r.user?.fullName}</div><div className="text-xs text-ink-500">{r.user?.email}</div></td>
                    <td className="px-5 py-3 whitespace-nowrap"><Stars value={r.rating} /></td>
                    <td className="px-5 py-3 max-w-sm break-words whitespace-pre-line">{r.comment || <span className="text-ink-400">(no text)</span>}
                      {r.status === 'hidden' && r.moderationReason && <div className="text-xs text-ink-500 mt-1">Hidden: {r.moderationReason}</div>}</td>
                    <td className="px-5 py-3"><Badge color={r.status === 'published' ? 'green' : 'red'}>{r.status}</Badge></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {r.status === 'published'
                        ? <button className="btn-ghost text-sm text-red-600" onClick={() => { setTarget(r); setReason(''); }}>Hide</button>
                        : <button className="btn-ghost text-sm" disabled={saving} onClick={() => decide(r, 'published')}>Restore</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data?.page || 1} pages={data?.pages || 1} onPageChange={setPage} />
      </Card>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Hide this review?" size="sm">
        <p className="text-sm text-ink-500 mb-3">The review will disappear from the storefront and the business's rating will be recalculated. The reviewer will still see it, marked as hidden.</p>
        <Textarea label="Reason (required, recorded in the audit log)" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn-ghost" onClick={() => setTarget(null)}>Cancel</button>
          <button className="btn-primary" disabled={saving || reason.trim().length < 3} onClick={() => decide(target, 'hidden', reason.trim())}>{saving ? 'Hiding…' : 'Hide review'}</button>
        </div>
      </Modal>
    </div>
  );
}
