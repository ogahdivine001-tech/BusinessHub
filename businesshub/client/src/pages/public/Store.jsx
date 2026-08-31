import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Store as StoreIcon, ImageIcon, Instagram, Facebook, Twitter, Globe, Minus, Plus, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../../components/Logo';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import WhatsAppButton from '../../components/WhatsAppButton';
import EmptyState from '../../components/EmptyState';
import { CardSkeleton } from '../../components/Skeleton';
import { businessService } from '../../services/businessService';
import { applyStoreSeo } from '../../utils/seo';

// Users sometimes type a bare domain or handle ("instagram.com/x" or
// "@x") instead of a full https:// URL — this keeps the link clickable
// either way instead of producing a broken relative link.
function normalizeUrl(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('@')) return `https://instagram.com/${trimmed.slice(1)}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function buildWhatsAppUrl(whatsapp, message) {
  const digits = whatsapp.replace(/[^\d]/g, '').replace(/^0/, '234');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function Store() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Order-capture modal state — collecting name/phone before the order
  // is registered and the customer is handed off to WhatsApp.
  const [orderProduct, setOrderProduct] = useState(null);
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', quantity: 1 });
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    businessService.getPublic(slug)
      .then((d) => {
        setData(d);
        applyStoreSeo(d.business);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const openOrderModal = (product) => {
    setOrderProduct(product);
    setOrderForm({ name: '', phone: '', quantity: 1 });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.name.trim() || !orderForm.phone.trim()) {
      toast.error('Please enter your name and phone number.');
      return;
    }
    setPlacingOrder(true);
    try {
      const result = await businessService.createPublicOrder(slug, {
        productId: orderProduct._id,
        quantity: orderForm.quantity,
        customerName: orderForm.name,
        customerPhone: orderForm.phone,
      });

      // The order is now saved in the business's dashboard — only after
      // that succeeds do we hand off to WhatsApp, so a failed request
      // never silently loses the order.
      const waMessage = `Hello ${data.business.name}, I just placed order ${result.orderNumber} for ${result.quantity} x ${result.productName} (₦${result.total.toLocaleString()}). My name is ${orderForm.name}.`;
      window.open(buildWhatsAppUrl(data.business.whatsapp, waMessage), '_blank', 'noopener,noreferrer');

      toast.success(`Order ${result.orderNumber} placed! Opening WhatsApp to confirm...`);
      setOrderProduct(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <EmptyState icon={StoreIcon} title="Business not found" description="This business page doesn't exist or is no longer available." />
      </div>
    );
  }

  const { business, products } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-40 sm:h-56 bg-gradient-to-br from-brand-500 to-brand-700 relative">
        {business.coverImage?.url && <img src={business.coverImage.url} className="w-full h-full object-cover" alt="" />}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-end gap-4 -mt-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-gray-900 border-4 border-white dark:border-gray-950 shadow-md flex items-center justify-center overflow-hidden shrink-0">
            {business.logo?.url ? <img src={business.logo.url} className="w-full h-full object-cover" alt={business.name} /> : <StoreIcon size={28} className="text-gray-300" />}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{business.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
              <Badge color="brand">{business.category}</Badge>
              {business.location?.city && <span className="flex items-center gap-1"><MapPin size={13} /> {business.location.city}, {business.location.state}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {business.whatsapp && (
              <WhatsAppButton phone={business.whatsapp} message={`Hello ${business.name}, I'm interested in your products.`} />
            )}
          </div>
        </div>

        {business.description && <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-2xl">{business.description}</p>}

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
          {business.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {business.phone}</span>}
          {business.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {business.email}</span>}
        </div>

        {business.socials && (business.socials.instagram || business.socials.facebook || business.socials.twitter || business.socials.website) && (
          <div className="flex flex-wrap gap-3 mt-4">
            {business.socials.instagram && (
              <a href={normalizeUrl(business.socials.instagram)} target="_blank" rel="noreferrer noopener"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {business.socials.facebook && (
              <a href={normalizeUrl(business.socials.facebook)} target="_blank" rel="noreferrer noopener"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 transition-colors">
                <Facebook size={16} />
              </a>
            )}
            {business.socials.twitter && (
              <a href={normalizeUrl(business.socials.twitter)} target="_blank" rel="noreferrer noopener"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 transition-colors">
                <Twitter size={16} />
              </a>
            )}
            {business.socials.website && (
              <a href={normalizeUrl(business.socials.website)} target="_blank" rel="noreferrer noopener"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 transition-colors">
                <Globe size={16} />
              </a>
            )}
          </div>
        )}

        {business.businessHours?.some((h) => h.open || h.close) && (
          <div className="mt-4 flex items-start gap-2 text-sm text-gray-500">
            <Clock size={14} className="mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {business.businessHours.map((h) => (
                <span key={h.day}>
                  <span className="font-medium text-gray-600 dark:text-gray-300">{h.day}: </span>
                  {h.closed ? 'Closed' : `${h.open || '—'} – ${h.close || '—'}`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 pb-16">
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          {products.length === 0 ? (
            <EmptyState icon={StoreIcon} title="No products yet" description="This business hasn't added any products yet. Check back soon!" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <div key={p._id} className="card overflow-hidden">
                  <div className="h-32 sm:h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
                    {p.images?.[0]?.url ? <img src={p.images[0].url} className="w-full h-full object-cover" alt={p.name} /> : <ImageIcon size={24} className="text-gray-300" />}
                    {p.discount > 0 && (
                      <span className="absolute top-2 left-2 badge bg-red-600 text-white">-{p.discount}%</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-sm">₦{(p.finalPrice ?? p.price).toLocaleString()}</span>
                        {p.discount > 0 && (
                          <span className="text-xs text-gray-400 line-through">₦{p.price.toLocaleString()}</span>
                        )}
                      </span>
                      {p.stockQuantity === 0 ? (
                        <Badge color="red">Out of stock</Badge>
                      ) : (
                        <Badge color="green">In stock</Badge>
                      )}
                    </div>
                    {business.whatsapp && p.stockQuantity !== 0 && (
                      <button
                        onClick={() => openOrderModal(p)}
                        className="btn bg-[#25D366] text-white hover:bg-[#1ebe5b] w-full mt-2.5 py-1.5 text-xs"
                      >
                        Order Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order capture modal — saves a real pending Order to the business's
          dashboard BEFORE handing the customer off to WhatsApp. */}
      <Modal open={!!orderProduct} onClose={() => setOrderProduct(null)} title={`Order: ${orderProduct?.name || ''}`} size="sm">
        <form onSubmit={submitOrder} className="space-y-4">
          <p className="text-sm text-gray-500">
            We'll note your order and open WhatsApp so you can confirm details with {business.name}.
          </p>
          <Input
            label="Your name"
            required
            value={orderForm.name}
            onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
            placeholder="e.g. Amaka Eze"
          />
          <Input
            label="Phone number"
            required
            type="tel"
            value={orderForm.phone}
            onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
            placeholder="08012345678"
          />
          <div>
            <label className="label">Quantity</label>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setOrderForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800">
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-medium">{orderForm.quantity}</span>
              <button type="button"
                onClick={() => setOrderForm((f) => ({ ...f, quantity: Math.min(20, f.quantity + 1) }))}
                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800">
                <Plus size={14} />
              </button>
              {orderProduct && (
                <span className="text-sm text-gray-500 ml-auto">
                  Total: ₦{((orderProduct.finalPrice ?? orderProduct.price) * orderForm.quantity).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOrderProduct(null)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={placingOrder} className="btn bg-[#25D366] text-white hover:bg-[#1ebe5b] flex-1">
              {placingOrder ? 'Placing order…' : 'Place order & chat'}
            </button>
          </div>
        </form>
      </Modal>

      {!business.hideBranding && (
        <footer className="text-center py-6 text-xs text-gray-400">
          Powered by <a href="/" className="font-medium text-brand-600">BusinessHub</a>
        </footer>
      )}
    </div>
  );
}
