import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import BusinessCard from './BusinessCard';
import { discoverService } from '../services/discoverService';

function Row({ title, note, businesses }) {
  if (!businesses.length) return null; // empty sections are hidden, never padded with samples
  return (
    <div className="mt-10 first:mt-0">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          {note && <p className="text-sm text-ink-500 mt-0.5">{note}</p>}
        </div>
        <Link to="/discover" className="text-sm font-medium text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 shrink-0 hover:underline">Browse all <ArrowRight size={14} /></Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{businesses.slice(0, 4).map((b) => <BusinessCard key={b._id} business={b} />)}</div>
    </div>
  );
}

// Real data only. If there is nothing to show yet (or the request fails), the
// whole section quietly disappears so the landing page never looks broken.
export default function HomeDiscovery() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    discoverService.home().then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!data || !(data.topRated.length || data.popular.length || data.newest.length)) return null;
  return (
    <section className="py-16 sm:py-20" aria-label="Discover businesses">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Row title="Top rated" note={`Based on customer reviews. Businesses need at least ${data.minReviews} reviews to be listed.`} businesses={data.topRated} />
        <Row title="Popular businesses" note="Most followed by customers" businesses={data.popular} />
        <Row title="New on BusinessHub" businesses={data.newest} />
      </div>
    </section>
  );
}
