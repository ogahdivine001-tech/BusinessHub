import { useEffect, useState } from 'react';
import { Plus, Search, Package, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Textarea from '../../components/Textarea';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import UsageBar from '../../components/UsageBar';
import Pagination from '../../components/Pagination';
import { productService, categoryService } from '../../services/productService';
import { subscriptionService } from '../../services/subscriptionService';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: '-name', label: 'Name (Z–A)' },
  { value: 'price', label: 'Price (low to high)' },
  { value: '-price', label: 'Price (high to low)' },
  { value: 'stockQuantity', label: 'Stock (low to high)' },
];

const EMPTY_FORM = { name: '', description: '', price: '', discount: '', category: '', stockQuantity: '', sku: '' };

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [images, setImages] = useState([]); // { url, publicId } (existing) or data URI string (new)
  const [uploading, setUploading] = useState(false);
  const [usage, setUsage] = useState(null); // { used, limit }

  const load = async () => {
    setLoading(true);
    try {
      const [{ products: p, pages: totalPages }, cats, sub] = await Promise.all([
        productService.list({ search, sort, page }),
        categoryService.list(),
        subscriptionService.getMine(),
      ]);
      setProducts(p);
      setPages(totalPages);
      setCategories(cats);
      setUsage({ used: sub.usage.products, limit: sub.limits.products });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setImages([]); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', price: p.price, discount: p.discount || '',
      category: p.category?._id || '', stockQuantity: p.stockQuantity, sku: p.sku || '',
    });
    setImages(p.images || []);
    setModalOpen(true);
  };

  const addImageFiles = async (fileList) => {
    setUploading(true);
    try {
      const files = Array.from(fileList).slice(0, 5 - images.length);
      const dataUris = await Promise.all(files.map(fileToDataUri));
      setImages((prev) => [...prev, ...dataUris]);
    } catch {
      toast.error('Could not read that image. Please try a different file.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discount: Number(form.discount) || 0,
        stockQuantity: Number(form.stockQuantity) || 0,
        category: form.category || undefined,
        images,
      };
      if (editing) {
        await productService.update(editing._id, payload);
        toast.success('Product updated.');
      } else {
        await productService.create(payload);
        toast.success('Product added.');
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
      await productService.remove(deleteTarget._id);
      toast.success('Product deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const atProductLimit = usage && Number.isFinite(usage.limit) && usage.used >= usage.limit;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-ink-500 text-sm mt-1">Manage what you sell.</p>
        </div>
        <button onClick={openCreate} disabled={atProductLimit} className="btn-primary" title={atProductLimit ? 'Product limit reached for your plan' : undefined}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {usage && (
        <div className="max-w-xs mb-4">
          <UsageBar label="Products used" used={usage.used} limit={usage.limit} />
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="sm:w-56">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>

      <Card className="p-5">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet."
            description="Add your first product to start building your online store."
            action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Product</button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p._id} className="rounded-xl border border-ink-100 dark:border-ink-800 overflow-hidden">
                <div className="h-32 bg-ink-100 dark:bg-ink-800 flex items-center justify-center relative">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={28} className="text-ink-300" />
                  )}
                  {p.discount > 0 && (
                    <span className="absolute top-2 left-2 badge bg-red-600 text-white">-{p.discount}%</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{p.name}</h4>
                    <Badge color={p.stockQuantity === 0 ? 'red' : p.isAvailable ? 'green' : 'gray'}>
                      {p.stockQuantity === 0 ? 'Out of stock' : p.isAvailable ? 'Available' : 'Hidden'}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1 line-clamp-2">{p.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-semibold">₦{(p.finalPrice ?? p.price).toLocaleString()}</span>
                      {p.discount > 0 && (
                        <span className="text-xs text-ink-400 line-through">₦{p.price.toLocaleString()}</span>
                      )}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit product' : 'Add product'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Photos</label>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800 group">
                  <img src={typeof img === 'string' ? img : img.url} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">
                    Remove
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-ink-200 dark:border-ink-800 flex items-center justify-center cursor-pointer text-ink-400 hover:border-brand-400 hover:text-brand-500 text-xs text-center px-1">
                  {uploading ? 'Uploading…' : '+ Add photo'}
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => e.target.files?.length && addImageFiles(e.target.files)} />
                </label>
              )}
            </div>
            <p className="text-xs text-ink-400 mt-1.5">Up to 5 photos. Requires Cloudinary to be configured on the server — see server/.env.</p>
          </div>
          <Input label="Product name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₦)" type="number" required min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Discount (%)" type="number" min="0" max="100" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Stock quantity" type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save product'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this product?"
        description={`"${deleteTarget?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
