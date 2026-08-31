import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { adminService } from '../../services/adminService';

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.subscriptions().then(setSubs).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
      <Card className="p-5">
        {loading ? <TableSkeleton rows={6} /> : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-2 font-medium">Business</th>
                  <th className="px-5 py-2 font-medium">Plan</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Renews</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s._id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="px-5 py-3 font-medium">{s.business?.name}</td>
                    <td className="px-5 py-3 capitalize">{s.plan}</td>
                    <td className="px-5 py-3"><Badge color={s.status === 'active' ? 'green' : 'red'}>{s.status}</Badge></td>
                    <td className="px-5 py-3 text-gray-500">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</td>
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
