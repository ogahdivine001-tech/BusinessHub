import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { Skeleton } from '../../components/Skeleton';
import { myOrderService } from '../../services/myOrderService';

// Plain wording for what the seller has recorded. BusinessHub does not take
// payment for these orders, so "paid" always means "the seller marked it paid".
const STATUS = {
  pending: { label: 'Awaiting confirmation', color: 'yellow' },
  processing: { label: 'In progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};
const PAYMENT = {
  unpaid: 'Payment not recorded yet',
  paid: 'Payment recorded by the seller',
  refunded: 'Refund recorded by the seller',
};

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;
const day = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function OrderCard({ order }) {
  const status = STATUS[order.status] || { label: order.status, color: 'gray' };
  const biz = order.business;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-ink-500">
            {biz?.slug ? (
              <Link to={`/store/${biz.slug}`} className="font-medium text-brand-700 dark:text-brand-400 hover:underline">{biz.name}</Link>
            ) : (
              <span className="font-medium">{biz?.name || 'A business that is no longer on BusinessHub'}</span>
            )}
            {' · '}
            <span>{day(order.createdAt)}</span>
          </p>
          <h2 className="text-base font-semibold mt-0.5 break-words">Order {order.orderNumber}</h2>
        </div>
        <Badge color={status.color}>{status.label}</Badge>
      </div>

      <ul className="mt-3 text-sm divide-y divide-ink-100 dark:divide-ink-800">
        {order.items.map((it, i) => (
          <li key={i} className="py-1.5 flex justify-between gap-3">
            <span className="min-w-0 break-words">{it.quantity} × {it.name}</span>
            <span className="text-ink-500 shrink-0">{naira(it.price * it.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink-500">{PAYMENT[order.paymentStatus] || ''}</span>
        <span className="font-semibold">Total {naira(order.total)}</span>
      </div>
    </Card>
  );
}

export default function MyOrders() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback((p) => {
    setError(null);
    return myOrderService.list(p).then(setData).catch((e) => setError(e.message || 'Could not load your orders.'));
  }, []);
  useEffect(() => { load(page); }, [load, page]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">My orders</h1>
      <p className="text-sm text-ink-500 mb-5">
        Orders you placed from business pages while logged in. The business confirms each order with you directly, usually on WhatsApp.
      </p>

      {error ? (
        <Card className="p-5" role="alert">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => load(page)} className="btn-secondary mt-3">Try again</button>
        </Card>
      ) : !data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your orders">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : data.orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders on your account yet"
          description="Orders you place while logged in will show up here. Orders you placed before, or without logging in, can't be added."
          action={<Link to="/discover" className="btn-primary">Discover businesses</Link>}
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.orders.map((o) => <OrderCard key={o.id} order={o} />)}
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
