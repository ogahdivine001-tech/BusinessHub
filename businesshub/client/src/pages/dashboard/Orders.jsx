import { useEffect, useState } from "react";
import { Plus, ShoppingCart, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import Card from "../../components/Card";
import Select from "../../components/Select";
import Modal from "../../components/Modal";
import Input from "../../components/Input";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import { TableSkeleton } from "../../components/Skeleton";
import Pagination from "../../components/Pagination";
import { orderService } from "../../services/orderService";
import { customerService } from "../../services/customerService";
import { productService } from "../../services/productService";

const STATUS_COLORS = {
  pending: "yellow",
  processing: "blue",
  completed: "green",
  cancelled: "red",
};
const STATUSES = ["pending", "processing", "completed", "cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ customer: "", notes: "" });
  const [items, setItems] = useState([{ product: "", quantity: 1 }]);

  const load = async () => {
    setLoading(true);
    try {
      const { orders: o, pages: totalPages } = await orderService.list({
        ...(statusFilter ? { status: statusFilter } : {}),
        page,
      });
      setOrders(o);
      setPages(totalPages);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = async () => {
    try {
      const [{ customers: c }, { products: p }] = await Promise.all([
        customerService.list({ limit: 100 }),
        productService.list({ limit: 100 }),
      ]);
      setCustomers(c);
      setProducts(p);
      setForm({ customer: c[0]?._id || "", notes: "" });
      setItems([{ product: p[0]?._id || "", quantity: 1 }]);
      setModalOpen(true);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addItemRow = () =>
    setItems([...items, { product: products[0]?._id || "", quantity: 1 }]);
  const removeItemRow = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItemRow = (i, patch) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const orderItems = items.map((it) => {
        const p = products.find((prod) => prod._id === it.product);
        return {
          product: it.product,
          name: p?.name || "Item",
          price: p?.finalPrice ?? p?.price ?? 0,
          quantity: Number(it.quantity),
        };
      });
      await orderService.create({
        customer: form.customer,
        items: orderItems,
        notes: form.notes,
      });
      toast.success("Order created.");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (order, status) => {
    try {
      await orderService.updateStatus(order._id, { status });
      toast.success("Order status updated.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const togglePaymentStatus = async (order) => {
    const next = order.paymentStatus === "paid" ? "unpaid" : "paid";
    try {
      await orderService.updateStatus(order._id, { paymentStatus: next });
      toast.success(`Marked as ${next}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await orderService.remove(deleteTarget._id);
      toast.success("Order deleted.");
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
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-ink-500 text-sm mt-1">
            Track and manage every sale.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> New Order
        </button>
      </div>

      <div className="mb-4 max-w-xs">
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <Card className="p-5">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet."
            description="Create your first order to get started."
            action={
              <button onClick={openCreate} className="btn-primary">
                <Plus size={16} /> New Order
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-2 font-medium">Order ID</th>
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Payment</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o._id}
                    className="border-b border-ink-50 dark:border-ink-800/50 last:border-0"
                  >
                    <td className="px-5 py-3 text-ink-500">{o.orderNumber}</td>
                    <td className="px-5 py-3 font-medium">
                      {o.customer?.name || "Customer"}
                    </td>
                    <td className="px-5 py-3">₦{o.total.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => togglePaymentStatus(o)}
                        title="Click to toggle paid/unpaid"
                        className={`badge cursor-pointer transition-opacity hover:opacity-75 ${
                          o.paymentStatus === "paid"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {o.paymentStatus}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o, e.target.value)}
                        className={`text-xs font-medium rounded-lg border-0 py-1 pl-2 pr-6 focus:ring-1 focus:ring-brand-500 ${
                          o.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : o.status === "processing"
                              ? "bg-blue-50 text-blue-700"
                              : o.status === "cancelled"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-ink-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setViewing(o)}
                          className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(o)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New order"
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <Select
            label="Customer"
            required
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
          >
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="space-y-3">
            <label className="label">Items</label>
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  className="input flex-1"
                  value={it.product}
                  onChange={(e) =>
                    updateItemRow(i, { product: e.target.value })
                  }
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₦{(p.finalPrice ?? p.price).toLocaleString()}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="input w-20"
                  value={it.quantity}
                  onChange={(e) =>
                    updateItemRow(i, { quantity: e.target.value })
                  }
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    className="text-red-500 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addItemRow}
              className="text-sm text-brand-600 hover:underline"
            >
              + Add item
            </button>
          </div>
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Saving…" : "Create order"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={`Order ${viewing?.orderNumber || ""}`}
      >
        {viewing && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-ink-500">Customer:</span>{" "}
              {viewing.customer?.name}
            </p>
            <div className="divide-y divide-ink-100 dark:divide-ink-800 border rounded-xl border-ink-100 dark:border-ink-800">
              {viewing.items.map((it, i) => (
                <div key={i} className="flex justify-between px-3 py-2">
                  <span>
                    {it.name} × {it.quantity}
                  </span>
                  <span>₦{(it.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="text-right font-semibold">
              Total: ₦{viewing.total.toLocaleString()}
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this order?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
