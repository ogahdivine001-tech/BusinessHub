import { useEffect, useState } from 'react';
import { Plus, FileText, Trash2, Download, CheckCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Select from '../../components/Select';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import UsageBar from '../../components/UsageBar';
import Pagination from '../../components/Pagination';
import { invoiceService } from '../../services/invoiceService';
import { customerService } from '../../services/customerService';
import { subscriptionService } from '../../services/subscriptionService';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ customer: '', dueDate: '', notes: '', discount: 0, tax: 0 });
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const [usage, setUsage] = useState(null); // { used, limit }
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [{ invoices: inv, pages: totalPages }, sub] = await Promise.all([
        invoiceService.list({ page }),
        subscriptionService.getMine(),
      ]);
      setInvoices(inv);
      setPages(totalPages);
      setUsage({ used: sub.usage.invoicesThisMonth, limit: sub.limits.invoicesPerMonth });
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
      setForm({ customer: c[0]?._id || '', dueDate: '', notes: '', discount: 0, tax: 0 });
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
      await invoiceService.create({
        ...form,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity), price: Number(it.price) })),
        discount: Number(form.discount) || 0,
        tax: Number(form.tax) || 0,
      });
      toast.success('Invoice created.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const shareInvoice = async (inv) => {
    const pdfUrl = invoiceService.pdfUrl(inv._id);
    const text = `Hi ${inv.customer?.name || ''}, here's your invoice ${inv.invoiceNumber} for ₦${inv.total.toLocaleString()}: ${pdfUrl}`;

    // Native share sheet (mobile browsers) is the best experience where
    // it exists — falls back to WhatsApp if the customer has a phone on
    // file, or just copies the link otherwise.
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${inv.invoiceNumber}`, text, url: pdfUrl });
        return;
      } catch {
        return; // user cancelled the share sheet — not an error
      }
    }
    if (inv.customer?.phone) {
      const digits = inv.customer.phone.replace(/[^\d]/g, '').replace(/^0/, '234');
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    await navigator.clipboard.writeText(pdfUrl);
    toast.success('Invoice link copied to clipboard.');
  };

  const toggleStatus = async (inv) => {
    try {
      await invoiceService.setStatus(inv._id, inv.status === 'paid' ? 'unpaid' : 'paid');
      toast.success('Invoice status updated.');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await invoiceService.remove(deleteTarget._id);
      toast.success('Invoice deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const atInvoiceLimit = usage && Number.isFinite(usage.limit) && usage.used >= usage.limit;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">Bill your customers professionally.</p>
        </div>
        <button onClick={openCreate} disabled={atInvoiceLimit} className="btn-primary" title={atInvoiceLimit ? 'Monthly invoice limit reached for your plan' : undefined}>
          <Plus size={18} /> Create Invoice
        </button>
      </div>

      {usage && (
        <div className="max-w-xs mb-6">
          <UsageBar label="Invoices this month" used={usage.used} limit={usage.limit} />
        </div>
      )}

      <Card className="p-5">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : invoices.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices yet." description="Create your first invoice to bill a customer."
            action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Create Invoice</button>} />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-2 font-medium">Invoice #</th>
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium">Total</th>
                  <th className="px-5 py-2 font-medium">Due date</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <td className="px-5 py-3 text-gray-500">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 font-medium">{inv.customer?.name}</td>
                    <td className="px-5 py-3">₦{inv.total.toLocaleString()}</td>
                    <td className="px-5 py-3 text-gray-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3"><Badge color={inv.status === 'paid' ? 'green' : 'yellow'}>{inv.status}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => toggleStatus(inv)} title="Toggle paid/unpaid" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"><CheckCircle size={14} /></button>
                        <a href={invoiceService.pdfUrl(inv._id)} target="_blank" rel="noreferrer" title="Download PDF" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Download size={14} /></a>
                        <button onClick={() => shareInvoice(inv)} title="Share" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Share2 size={14} /></button>
                        <button onClick={() => setDeleteTarget(inv)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create invoice" size="lg">
        <form onSubmit={save} className="space-y-4">
          <Select label="Customer" required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}>
            {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
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
          <div className="grid grid-cols-3 gap-4">
            <Input label="Discount (₦)" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            <Input label="Tax (₦)" type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
            <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <Input label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Create invoice'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete this invoice?" confirmLabel="Delete"
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
