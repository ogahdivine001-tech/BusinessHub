import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { adminService } from '../../services/adminService';

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { businesses: b } = await adminService.businesses({ search });
      setBusinesses(b);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePublished = async (b) => {
    try {
      await adminService.setBusinessPublished(b._id, !b.isPublished);
      toast.success(b.isPublished ? 'Business unpublished.' : 'Business published.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Businesses</h1>
      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Search businesses..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card className="p-5">
        {loading ? <TableSkeleton rows={6} /> : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Business</th>
                  <th className="px-5 py-2 font-medium">Owner</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0">
                    <td className="px-5 py-3 font-medium">{b.name}</td>
                    <td className="px-5 py-3 text-ink-500">{b.owner?.email}</td>
                    <td className="px-5 py-3">{b.category}</td>
                    <td className="px-5 py-3"><Badge color={b.isPublished ? 'green' : 'gray'}>{b.isPublished ? 'Published' : 'Hidden'}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => togglePublished(b)} className="text-xs text-brand-600 hover:underline">
                        {b.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                    </td>
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
