import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Pencil, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import Pagination from '../../components/Pagination';
import { customerService } from '../../services/customerService';
import { downloadCsv } from '../../utils/csv';

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { customers: c, pages: totalPages } = await customerService.list({ search, page });
      setCustomers(c);
      setPages(totalPages);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await customerService.update(editing._id, form);
        toast.success('Customer updated.');
      } else {
        await customerService.create(form);
        toast.success('Customer added.');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await customerService.remove(deleteTarget._id);
      toast.success('Customer deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Pull the full list for export, not just the current page — a
      // high limit rather than a dedicated endpoint, since the dataset
      // is small enough per business that this stays fast.
      const { customers: all } = await customerService.list({ search, limit: 5000 });
      if (all.length === 0) {
        toast.error('No customers to export.');
        return;
      }
      downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, all, [
        { label: 'Name', value: (c) => c.name },
        { label: 'Phone', value: (c) => c.phone || '' },
        { label: 'Email', value: (c) => c.email || '' },
        { label: 'Address', value: (c) => c.address || '' },
        { label: 'Total Orders', value: (c) => c.totalOrders },
        { label: 'Total Spent', value: (c) => c.totalSpent },
        { label: 'Notes', value: (c) => c.notes || '' },
        { label: 'Customer Since', value: (c) => new Date(c.createdAt).toLocaleDateString() },
      ]);
      toast.success(`Exported ${all.length} customer${all.length === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-ink-500 text-sm mt-1">Know who's buying from you.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={exporting} className="btn-secondary">
            <Download size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Add Customer</button>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="p-5">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers yet."
            description="Add your first customer to start tracking orders and spend."
            action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Customer</button>} />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Phone</th>
                  <th className="px-5 py-2 font-medium">Orders</th>
                  <th className="px-5 py-2 font-medium">Total spent</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0">
                    <td className="px-5 py-3 font-medium">
                      <Link to={`/dashboard/customers/${c._id}`} className="hover:text-brand-600 hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-5 py-3 text-ink-500">{c.phone || '—'}</td>
                    <td className="px-5 py-3">{c.totalOrders}</td>
                    <td className="px-5 py-3">₦{c.totalSpent.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit customer' : 'Add customer'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save customer'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete this customer?" description={`"${deleteTarget?.name}" will be permanently removed.`}
        confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
