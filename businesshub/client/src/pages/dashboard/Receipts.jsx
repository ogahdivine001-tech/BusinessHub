import { useEffect, useState } from 'react';
import { Plus, Receipt as ReceiptIcon, Trash2, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Select from '../../components/Select';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import Pagination from '../../components/Pagination';
import { receiptService } from '../../services/receiptService';
import { customerService } from '../../services/customerService';

const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'paystack', 'other'];

export default function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ customer: '', paymentMethod: 'cash' });
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { receipts: r, pages: totalPages } = await receiptService.list({ page });
      setReceipts(r);
      setPages(totalPages);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = async () => {
    try {
      const { customers: c } = await customerService.list({ limit: 100 });
      setCustomers(c);
      setForm({ customer: c[0]?._id || '', paymentMethod: 'cash' });
      setItems([{ description: '', quantity: 1, price: 0 }]);
      setModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, price: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await receiptService.create({
        ...form,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity), price: Number(it.price) })),
      });
      toast.success('Receipt generated.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const shareReceipt = async (r) => {
    const pdfUrl = receiptService.pdfUrl(r._id);
    const text = `Hi ${r.customer?.name || ''}, here's your receipt ${r.receiptNumber} for ₦${r.total.toLocaleString()}: ${pdfUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Receipt ${r.receiptNumber}`, text, url: pdfUrl });
        return;
      } catch {
        return;
      }
    }
    if (r.customer?.phone) {
      const digits = r.customer.phone.replace(/[^\d]/g, '').replace(/^0/, '234');
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    await navigator.clipboard.writeText(pdfUrl);
    toast.success('Receipt link copied to clipboard.');
  };

  const confirmDelete = async () => {
    try {
      await receiptService.remove(deleteTarget._id);
      toast.success('Receipt deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Receipts</h1>
          <p className="text-gray-500 text-sm mt-1">Generate proof of payment for your customers.</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Generate Receipt</button>
      </div>

      <Card className="p-5">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : receipts.length === 0 ? (
          <EmptyState icon={ReceiptIcon} title="No receipts yet." description="Generate a receipt once a customer pays."
            action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Generate Receipt</button>} />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-2 font-medium">Receipt #</th>
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium">Total</th>
                  <th className="px-5 py-2 font-medium">Method</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="px-5 py-3 text-gray-500">{r.receiptNumber}</td>
                    <td className="px-5 py-3 font-medium">{r.customer?.name}</td>
                    <td className="px-5 py-3">₦{r.total.toLocaleString()}</td>
                    <td className="px-5 py-3 capitalize text-gray-500">{r.paymentMethod}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <a href={receiptService.pdfUrl(r._id)} target="_blank" rel="noreferrer" title="Download PDF" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Download size={14} /></a>
                        <button onClick={() => shareReceipt(r)} title="Share" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Share2 size={14} /></button>
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generate receipt" size="lg">
        <form onSubmit={save} className="space-y-4">
          <Select label="Customer" required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <Select label="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <div className="space-y-3">
            <label className="label">Items</label>
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="input flex-1" placeholder="Description" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                <input type="number" min="1" className="input w-16" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value })} />
                <input type="number" min="0" className="input w-24" placeholder="Price" value={it.price} onChange={(e) => updateItem(i, { price: e.target.value })} />
                {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 p-1"><Trash2 size={16} /></button>}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:underline">+ Add item</button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Generate receipt'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete this receipt?" confirmLabel="Delete"
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
