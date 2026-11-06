import { Link } from 'react-router-dom';
import { MapPin, Store as StoreIcon, Truck, Users } from 'lucide-react';
import Badge from './Badge';
import VerifiedBadge from './VerifiedBadge';
import { RatingLine } from './StarRating';

export default function BusinessCard({ business: b }) {
  return (
    <Link to={`/store/${b.slug}`} className="card overflow-hidden block hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <div className="h-24 bg-gradient-to-br from-brand-500 to-brand-700">
        {b.coverImage?.url && <img src={b.coverImage.url} alt="" loading="lazy" className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 -mt-10">
          <div className="w-14 h-14 rounded-xl bg-white dark:bg-ink-900 border-2 border-white dark:border-ink-900 shadow flex items-center justify-center overflow-hidden shrink-0">
            {b.logo?.url ? <img src={b.logo.url} alt="" loading="lazy" className="w-full h-full object-cover" /> : <StoreIcon size={22} className="text-ink-300" />}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <h3 className="font-semibold line-clamp-1">{b.name}</h3>
          <VerifiedBadge status={b.verification?.status} />
        </div>
        <div className="mt-1"><RatingLine average={b.ratingAverage} count={b.ratingCount} /></div>
        {b.description && <p className="text-sm text-ink-500 mt-2 line-clamp-2">{b.description}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-ink-500">
          <Badge color="brand">{b.category}</Badge>
          {b.location?.city && <span className="inline-flex items-center gap-1"><MapPin size={12} />{b.location.city}</span>}
          {b.delivery?.status === 'available' && <span className="inline-flex items-center gap-1"><Truck size={12} />Delivery</span>}
          {b.followerCount > 0 && <span className="inline-flex items-center gap-1"><Users size={12} />{b.followerCount}</span>}
        </div>
      </div>
    </Link>
  );
}
