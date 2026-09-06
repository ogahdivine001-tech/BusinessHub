import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Pencil, ShoppingBag, Wallet, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton, CardSkeleton } from '../../components/Skeleton';
import { customerService } from '../../services/customerService';
import { orderService } from '../../services/orderService';

const STATUS_COLORS = { pending: 'yellow', processing: 'blue', completed: 'green', cancelled: 'red' };

export default function CustomerProfile() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, { orders: o }] = await Promise.all([
        customerService.get(id),
        orderService.list({ customer: id, limit: 50 }),
      ]);
      setCustomer(c);
      setOrders(o);
      setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await customerService.update(id, form);
      setCustomer(updated);
      toast.success('Customer updated.');
      setEditOpen(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <EmptyState title="Customer not found" description="This customer may have been deleted." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link to="/dashboard/customers" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 dark:hover:text-ink-200 mb-5">
        <ArrowLeft size={15} /> Back to customers
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center text-lg font-semibold shrink-0">
            {customer.name?.charAt(0) || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-ink-500">
              {customer.phone && <span className="flex items-center gap-1.5"><Phone size={13} /> {customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {customer.email}</span>}
              {customer.address && <span className="flex items-center gap-1.5"><MapPin size={13} /> {customer.address}</span>}
            </div>
          </div>
        </div>
        <button onClick={() => setEditOpen(true)} className="btn-secondary shrink-0"><Pencil size={14} /> Edit</button>
      </div>

      {customer.notes && (
        <Card className="p-4 mb-6 text-sm text-ink-600 dark:text-ink-300 bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
          <span className="font-medium">Notes: </span>{customer.notes}
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs mb-1"><Hash size={13} /> Total orders</div>
          <p className="text-xl font-bold">{customer.totalOrders}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-ink-500 text-xs mb-1"><Wallet size={13} /> Total spent</div>
          <p className="text-xl font-bold">₦{customer.totalSpent.toLocaleString()}</p>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-ink-500 text-xs mb-1"><ShoppingBag size={13} /> Customer since</div>
          <p className="text-xl font-bold">{new Date(customer.createdAt).toLocaleDateString()}</p>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Purchase history</h3>
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders yet" description="Orders from this customer will show up here." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Order ID</th>
                  <th className="px-5 py-2 font-medium">Items</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-ink-50 dark:border-ink-800/50 last:border-0">
                    <td className="px-5 py-3 text-ink-500">{o.orderNumber}</td>
                    <td className="px-5 py-3">{o.items.map((it) => it.name).join(', ')}</td>
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

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit customer">
        <form onSubmit={save} className="space-y-4">
          <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
