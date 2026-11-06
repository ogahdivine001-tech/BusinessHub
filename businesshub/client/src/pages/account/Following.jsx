import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import toast from 'react-hot-toast';
import BusinessCard from '../../components/BusinessCard';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import { engageService } from '../../services/engageService';

export default function Following() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = useCallback((p) => engageService.following(p).then(setData).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(page); }, [load, page]);

  const unfollow = async (b) => {
    try {
      await engageService.unfollow(b._id);
      toast.success(`Unfollowed ${b.name}.`);
      // If that was the last card on this page, step back one page.
      if (data.businesses.length === 1 && page > 1) setPage(page - 1); else load(page);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Businesses you follow</h1>
      <p className="text-sm text-ink-500 mb-5">{data ? `${data.total} business${data.total === 1 ? '' : 'es'}` : ' '}</p>
      {!data ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : data.businesses.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="You're not following any businesses yet" description="Follow businesses from their page to keep track of the ones you like."
          action={<Link to="/discover" className="btn-primary">Discover businesses</Link>} />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.businesses.map((b) => (
              <div key={b._id}>
                <BusinessCard business={b} />
                <button onClick={() => unfollow(b)} className="text-xs text-ink-500 hover:text-red-600 mt-1.5 ml-1 underline">Unfollow</button>
              </div>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
