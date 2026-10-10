import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import StatCard from '../../components/StatCard';
import Select from '../../components/Select';
import { CardSkeleton } from '../../components/Skeleton';
import { DollarSign, ShoppingCart, Users, Package, Lock } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { subscriptionService } from '../../services/subscriptionService';

const COLORS = ['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];
const RANGES = [{ v: '7d', l: '7 days' }, { v: '30d', l: '30 days' }, { v: '90d', l: '90 days' }, { v: '1y', l: '1 year' }];

export default function Analytics() {
  const [range, setRange] = useState('30d');
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [allowedRanges, setAllowedRanges] = useState(['7d', '30d']); // conservative default until we know the real plan
  const [loading, setLoading] = useState(true);

  // Learn which ranges this business's plan actually allows, so the
  // dropdown can't even offer options the backend would reject.
  useEffect(() => {
    subscriptionService.getMine()
      .then(({ limits }) => setAllowedRanges(limits.analyticsRanges))
      .catch(() => {}); // non-fatal — falls back to the basic ranges above
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsService.overview(range),
      analyticsService.revenue(range),
      analyticsService.salesByCategory(),
      analyticsService.bestSellers(),
    ]).then(([s, r, c, b]) => {
      setStats(s); setSeries(r); setCategories(c); setBestSellers(b);
    }).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-ink-500 text-sm mt-1">Understand how your business is performing.</p>
        </div>
        <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-48">
          {RANGES.map((r) => {
            const locked = !allowedRanges.includes(r.v);
            return (
              <option key={r.v} value={r.v} disabled={locked}>
                {r.l}{locked ? ' (Upgrade to unlock)' : ''}
              </option>
            );
          })}
        </Select>
      </div>

      {allowedRanges.length < RANGES.length && (
        <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/40 px-4 py-3 text-sm text-brand-700 dark:text-brand-400 flex items-center gap-2 mb-6">
          <Lock size={15} className="shrink-0" />
          <span>You're on basic analytics (7 &amp; 30 day views). <Link to="/dashboard/settings?tab=Subscription" className="font-medium underline">Upgrade</Link> for 90-day and 1-year ranges.</span>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenue" value={stats?.revenue.value || 0} change={stats?.revenue.change} icon={DollarSign} prefix="₦" />
            <StatCard label="Orders" value={stats?.orders.value || 0} change={stats?.orders.change} icon={ShoppingCart} />
            <StatCard label="Customers" value={stats?.customers.value || 0} icon={Users} />
            <StatCard label="Products" value={stats?.products.value || 0} icon={Package} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-semibold mb-4">Revenue by day</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `₦${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Sales by category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categories} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₦${v.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Best-selling products</h3>
            {bestSellers.length === 0 ? (
              <p className="text-sm text-ink-500">No sales data yet.</p>
            ) : (
              <div className="space-y-3">
                {bestSellers.map((p, i) => (
                  <div key={p._id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-3"><span className="text-ink-400 w-4">{i + 1}</span>{p.name}</span>
                    <span className="text-ink-500">{p.quantitySold} sold · ₦{p.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
