import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Users, Package, Plus, FileText, UserPlus,
  Sparkles, Store,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { CardSkeleton, TableSkeleton } from '../../components/Skeleton';
import { analyticsService } from '../../services/analyticsService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { pending: 'yellow', processing: 'blue', completed: 'green', cancelled: 'red' };

const QUICK_ACTIONS = [
  { to: '/dashboard/products', label: 'Add Product', icon: Plus },
  { to: '/dashboard/invoices', label: 'Create Invoice', icon: FileText },
  { to: '/dashboard/customers', label: 'Add Customer', icon: UserPlus },
  { to: '/dashboard/marketing', label: 'Generate Marketing Content', icon: Sparkles },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, revenueData, categoryData, ordersData] = await Promise.all([
          analyticsService.overview('30d'),
          analyticsService.revenue('30d'),
          analyticsService.salesByCategory(),
          orderService.list({ limit: 5 }),
        ]);
        setStats(statsData);
        setSeries(revenueData);
        setCategories(categoryData);
        setOrders(ordersData.orders);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋</h1>
        <p className="text-ink-500 text-sm mt-1">Here's what's happening with your business today.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.to} to={a.to} className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-card-hover transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <a.icon size={18} className="text-brand-600" />
            </div>
            <span className="text-xs font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Revenue" value={stats?.revenue.value || 0} change={stats?.revenue.change} icon={DollarSign} prefix="₦" />
          <StatCard label="Orders" value={stats?.orders.value || 0} change={stats?.orders.change} icon={ShoppingCart} />
          <StatCard label="Customers" value={stats?.customers.value || 0} icon={Users} />
          <StatCard label="Products" value={stats?.products.value || 0} icon={Package} />
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold mb-4">Revenue overview</h3>
          <ResponsiveContainer width="100%" height={260}>
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
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₦${v.toLocaleString()}`} />
              <Bar dataKey="total" fill="#818cf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent orders</h3>
          <Link to="/dashboard/orders" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <TableSkeleton rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders yet" description="Orders from your storefront and manual entries will show up here." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium">Order ID</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0">
                    <td className="px-5 py-3">{o.customer?.name || 'Customer'}</td>
                    <td className="px-5 py-3 text-ink-500">{o.orderNumber}</td>
                    <td className="px-5 py-3 font-medium">₦{o.total.toLocaleString()}</td>
                    <td className="px-5 py-3"><Badge color={STATUS_COLORS[o.status]}>{o.status}</Badge></td>
                    <td className="px-5 py-3 text-ink-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
