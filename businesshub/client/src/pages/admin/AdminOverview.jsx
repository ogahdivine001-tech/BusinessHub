import { useEffect, useState } from 'react';
import { Users, Store, CreditCard, DollarSign, UserPlus, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';
import { CardSkeleton } from '../../components/Skeleton';
import { adminService } from '../../services/adminService';

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.overview().then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Overview</h1>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Users" value={data.totalUsers} icon={Users} />
          <StatCard label="Sellers" value={data.totalSellers ?? 0} icon={Store} />
          <StatCard label="Customers" value={data.totalBuyers ?? 0} icon={Users} />
          <StatCard label="Total Businesses" value={data.totalBusinesses} icon={Store} />
          <StatCard label="Active Subscriptions" value={data.activeSubscriptions} icon={CreditCard} />
          <StatCard label="Verified Businesses" value={data.verifiedBusinesses ?? 0} icon={Store} />
          <StatCard label="Pending Verification" value={data.pendingVerifications ?? 0} icon={Building} />
          <StatCard label="Sales recorded by sellers" value={data.revenue} icon={DollarSign} prefix="₦" />
          <StatCard label="New Users (30d)" value={data.newUsers} icon={UserPlus} />
          <StatCard label="New Businesses (30d)" value={data.newBusinesses} icon={Building} />
        </div>
      )}
    </div>
  );
}
