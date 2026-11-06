import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { Stars } from '../../components/StarRating';
import { Skeleton } from '../../components/Skeleton';
import { engageService } from '../../services/engageService';

export default function MyReviews() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = useCallback((p) => engageService.myReviews(p).then(setData).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(page); }, [load, page]);

  const remove = async (r) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await engageService.deleteReview(r._id);
      toast.success('Review deleted.');
      if (data.reviews.length === 1 && page > 1) setPage(page - 1); else load(page);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Your reviews</h1>
      <p className="text-sm text-ink-500 mb-5">Reviews are public and show your first name and last initial.</p>
      {!data ? <Skeleton className="h-32" /> : data.reviews.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="You haven't written any reviews yet" description="Open a business page and share your experience to help other customers."
          action={<Link to="/discover" className="btn-primary">Discover businesses</Link>} />
      ) : (
        <>
          <ul className="space-y-3">
            {data.reviews.map((r) => (
              <li key={r._id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {r.business ? <Link to={`/store/${r.business.slug}`} className="font-semibold hover:underline">{r.business.name}</Link> : <span className="font-semibold text-ink-400">Business no longer available</span>}
                    <span className="text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2"><Stars value={r.rating} size={16} />{r.status === 'hidden' && <Badge color="red">Hidden by a moderator</Badge>}</div>
                  {r.comment && <p className="text-sm text-ink-600 dark:text-ink-400 mt-2 whitespace-pre-line break-words">{r.comment}</p>}
                  <div className="mt-3 flex gap-4 text-sm">
                    {r.business && <Link to={`/store/${r.business.slug}`} className="text-brand-600 dark:text-brand-400 hover:underline">Edit on business page</Link>}
                    <button onClick={() => remove(r)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
