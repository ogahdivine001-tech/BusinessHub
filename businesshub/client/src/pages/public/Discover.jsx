import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '../../components/Input';
import Select from '../../components/Select';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import BusinessCard from '../../components/BusinessCard';
import { Skeleton } from '../../components/Skeleton';
import { discoverService } from '../../services/discoverService';

const CATEGORIES = ['Fashion', 'Electronics', 'Food', 'Beauty', 'Real Estate', 'Education', 'Technology', 'Graphics & Design', 'Website Development', 'Health & Fitness', 'Services', 'Other'];

// All filters live in the URL, so a search can be bookmarked, shared, and the
// browser's Back button works.
export default function Discover() {
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const key = params.toString();
  useEffect(() => {
    let cancelled = false; // ignore answers that arrive after the filters changed
    setLoading(true); setFailed(false);
    discoverService.search(Object.fromEntries(params))
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) { setFailed(true); toast.error(e.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: undefined, ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const hasFilters = ['q', 'category', 'city', 'delivery', 'verified', 'minRating'].some((k) => params.get(k));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Discover businesses</h1>
      <p className="text-ink-500 mt-1">Find businesses and products near you, read reviews, and follow the ones you like.</p>

      <form onSubmit={(e) => { e.preventDefault(); set({ q: text.trim() }); }} className="mt-6 flex gap-2" role="search">
        <div className="flex-1">
          <Input aria-label="Search businesses and products" placeholder="Search by business, product, category or city" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} />
        </div>
        <button type="submit" className="btn-primary shrink-0"><Search size={16} /> Search</button>
      </form>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Select aria-label="Category" value={params.get('category') || ''} onChange={(e) => set({ category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input aria-label="City" placeholder="City" defaultValue={params.get('city') || ''} key={`c-${params.get('city') || ''}`}
          onKeyDown={(e) => { if (e.key === 'Enter') set({ city: e.target.value.trim() }); }} onBlur={(e) => { if (e.target.value.trim() !== (params.get('city') || '')) set({ city: e.target.value.trim() }); }} />
        <Select aria-label="Minimum rating" value={params.get('minRating') || ''} onChange={(e) => set({ minRating: e.target.value })}>
          <option value="">Any rating</option>
          {[4, 3, 2].map((n) => <option key={n} value={n}>{n}★ and up</option>)}
        </Select>
        <Select aria-label="Sort by" value={params.get('sort') || ''} onChange={(e) => set({ sort: e.target.value })}>
          <option value="">{params.get('q') ? 'Best match' : 'Newest'}</option>
          <option value="rating">Top rated</option>
          <option value="followers">Most followed</option>
          <option value="newest">Newest</option>
          <option value="name">Name (A–Z)</option>
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={params.get('delivery') === 'available'} onChange={(e) => set({ delivery: e.target.checked ? 'available' : '' })} /> Delivery available</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={params.get('verified') === 'true'} onChange={(e) => set({ verified: e.target.checked ? 'true' : '' })} /> Verified only</label>
      </div>
      {params.get('sort') === 'rating' && (
        <p className="text-xs text-ink-500 mt-2">Businesses with at least 3 reviews are listed first, ordered by a fair score that accounts for how many reviews they have.</p>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56" />)}</div>
        ) : failed ? (
          <EmptyState icon={SearchX} title="We couldn't load businesses" description="Please check your connection and try again."
            action={<button className="btn-primary" onClick={() => setParams(new URLSearchParams(params))}>Try again</button>} />
        ) : data.businesses.length === 0 ? (
          <EmptyState icon={SearchX} title={hasFilters ? 'No businesses match your search' : 'No businesses yet'}
            description={hasFilters ? 'Try a different word, or remove some filters.' : 'Businesses will appear here as they join BusinessHub.'}
            action={hasFilters ? <button className="btn-secondary" onClick={() => { setText(''); setParams(new URLSearchParams()); }}>Clear filters</button> : null} />
        ) : (
          <>
            <p className="text-sm text-ink-500 mb-3">{data.total} business{data.total === 1 ? '' : 'es'}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{data.businesses.map((b) => <BusinessCard key={b._id} business={b} />)}</div>
            <Pagination page={data.page} pages={data.pages} onPageChange={(p) => { set({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>
    </div>
  );
}
