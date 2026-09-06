import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, ExternalLink, Upload, Lock, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Textarea from '../../components/Textarea';
import { CardSkeleton } from '../../components/Skeleton';
import { businessService } from '../../services/businessService';
import { subscriptionService } from '../../services/subscriptionService';

const CATEGORIES = ['Fashion', 'Electronics', 'Food', 'Beauty', 'Real Estate', 'Education', 'Technology', 'Graphics & Design', 'Health & Fitness', 'Services', 'Other'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const THEMES = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold', pro: true },
];

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MyBusiness() {
  const [business, setBusiness] = useState(null);
  const [limits, setLimits] = useState({ premiumThemes: false, customBranding: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    businessService.getMine()
      .then((b) => {
        const existing = b.businessHours || [];
        const hours = DAYS.map((day) => existing.find((h) => h.day === day) || { day, open: '09:00', close: '18:00', closed: false });
        setBusiness({ ...b, businessHours: hours });
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    subscriptionService.getMine().then(({ limits: l }) => setLimits(l)).catch(() => {});
  }, []);

  const update = (patch) => setBusiness((b) => ({ ...b, ...patch }));

  const updateHour = (day, patch) => setBusiness((b) => ({
    ...b,
    businessHours: b.businessHours.map((h) => (h.day === day ? { ...h, ...patch } : h)),
  }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await businessService.update({
        name: business.name, description: business.description, category: business.category,
        phone: business.phone, whatsapp: business.whatsapp, email: business.email,
        address: business.address, location: business.location, socials: business.socials,
        theme: business.theme, hideBranding: business.hideBranding, businessHours: business.businessHours,
      });
      setBusiness(updated);
      toast.success('Business updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    try {
      const dataUri = await fileToDataUri(file);
      const updated = await businessService.uploadImage(dataUri, type);
      setBusiness(updated);
      toast.success(type === 'coverImage' ? 'Cover photo updated.' : 'Logo updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-4"><CardSkeleton /><CardSkeleton /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Business</h1>
          <p className="text-ink-500 text-sm mt-1">Manage how customers see you.</p>
        </div>
        <a href={`/store/${business?.slug}`} target="_blank" rel="noreferrer" className="btn-secondary">
          View page <ExternalLink size={14} />
        </a>
      </div>

      <Card className="p-0 mb-5 overflow-hidden">
        <div className="relative h-40 sm:h-48 bg-gradient-to-br from-brand-500 to-brand-700 group">
          {business?.coverImage?.url && (
            <img src={business.coverImage.url} className="w-full h-full object-cover" alt="Cover" />
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
            <span className="btn-secondary">
              <Upload size={16} /> {uploading === 'coverImage' ? 'Uploading…' : 'Change cover photo'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'coverImage')} />
          </label>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10">
            <div className="relative group w-20 h-20 rounded-2xl bg-white dark:bg-ink-900 border-4 border-white dark:border-ink-900 shadow-md overflow-hidden shrink-0">
              <div className="w-full h-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                {business?.logo?.url ? <img src={business.logo.url} className="w-full h-full object-cover" alt="Logo" /> : <Store size={24} className="text-ink-400" />}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                <Upload size={16} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
              </label>
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium">{business?.name}</p>
              <p className="text-xs text-ink-400">Hover the cover or logo to change it</p>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={save}>
        <Card className="p-6 mb-5 space-y-4">
          <h3 className="font-semibold">Business details</h3>
          <Input label="Business name" value={business.name} onChange={(e) => update({ name: e.target.value })} />
          <Select label="Category" value={business.category} onChange={(e) => update({ category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Textarea label="Description" rows={4} value={business.description || ''} onChange={(e) => update({ description: e.target.value })} />
        </Card>

        <Card className="p-6 mb-5 space-y-4">
          <h3 className="font-semibold">Contact & location</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Phone" value={business.phone || ''} onChange={(e) => update({ phone: e.target.value })} />
            <Input label="WhatsApp" value={business.whatsapp || ''} onChange={(e) => update({ whatsapp: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={business.email || ''} onChange={(e) => update({ email: e.target.value })} />
          <Input label="Address" value={business.address || ''} onChange={(e) => update({ address: e.target.value })} />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="City" value={business.location?.city || ''} onChange={(e) => update({ location: { ...business.location, city: e.target.value } })} />
            <Input label="State" value={business.location?.state || ''} onChange={(e) => update({ location: { ...business.location, state: e.target.value } })} />
          </div>
        </Card>

        <Card className="p-6 mb-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Clock size={16} /> Business hours</h3>
          <div className="space-y-2">
            {business.businessHours.map((h) => (
              <div key={h.day} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <span className="text-sm w-24 shrink-0">{h.day}</span>
                {h.closed ? (
                  <span className="text-sm text-ink-400 flex-1">Closed</span>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={h.open} onChange={(e) => updateHour(h.day, { open: e.target.value })} className="input py-1.5 text-sm w-full" />
                    <span className="text-ink-400 text-sm">to</span>
                    <input type="time" value={h.close} onChange={(e) => updateHour(h.day, { close: e.target.value })} className="input py-1.5 text-sm w-full" />
                  </div>
                )}
                <label className="flex items-center gap-1.5 text-xs text-ink-500 shrink-0 cursor-pointer">
                  <input type="checkbox" checked={h.closed} onChange={(e) => updateHour(h.day, { closed: e.target.checked })} className="rounded border-ink-300" />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 mb-5 space-y-4">
          <h3 className="font-semibold">Social media</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Instagram" value={business.socials?.instagram || ''} onChange={(e) => update({ socials: { ...business.socials, instagram: e.target.value } })} placeholder="https://instagram.com/yourbusiness" />
            <Input label="Facebook" value={business.socials?.facebook || ''} onChange={(e) => update({ socials: { ...business.socials, facebook: e.target.value } })} placeholder="https://facebook.com/yourbusiness" />
            <Input label="Twitter / X" value={business.socials?.twitter || ''} onChange={(e) => update({ socials: { ...business.socials, twitter: e.target.value } })} placeholder="https://x.com/yourbusiness" />
            <Input label="Website" value={business.socials?.website || ''} onChange={(e) => update({ socials: { ...business.socials, website: e.target.value } })} placeholder="https://yourbusiness.com" />
          </div>
        </Card>

        <Card className="p-6 mb-5 space-y-4">
          <h3 className="font-semibold">Appearance</h3>

          <div>
            <label className="label">Business page style</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEMES.map((t) => {
                const locked = t.pro && !limits.premiumThemes;
                return (
                  <button
                    key={t.value}
                    type="button"
                    disabled={locked}
                    onClick={() => update({ theme: t.value })}
                    className={`relative p-3 rounded-xl border text-left transition-colors ${
                      business.theme === t.value ? 'border-brand-600 ring-2 ring-brand-100 dark:ring-brand-900/40' : 'border-ink-200 dark:border-ink-800'
                    } ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-300'}`}
                  >
                    {locked && <Lock size={12} className="absolute top-2 right-2 text-ink-400" />}
                    <div className="h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 mb-2" />
                    <p className="text-xs font-medium">{t.label}</p>
                    {t.pro && <p className="text-[10px] text-brand-600 mt-0.5">Pro</p>}
                  </button>
                );
              })}
            </div>
            {!limits.premiumThemes && (
              <p className="text-xs text-ink-400 mt-2">
                <Link to="/dashboard/settings?tab=Subscription" className="text-brand-600 underline">Upgrade to Pro</Link> to unlock the Bold theme.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-ink-100 dark:border-ink-800">
            <div className="pr-4">
              <p className="text-sm font-medium flex items-center gap-1.5">
                Remove "Powered by BusinessHub"
                {!limits.customBranding && <Lock size={12} className="text-ink-400" />}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                {limits.customBranding
                  ? 'Hide the BusinessHub footer on your public storefront.'
                  : <>Available on Starter and Pro. <Link to="/dashboard/settings?tab=Subscription" className="text-brand-600 underline">Upgrade</Link> to enable custom branding.</>}
              </p>
            </div>
            <button
              type="button"
              disabled={!limits.customBranding}
              onClick={() => update({ hideBranding: !business.hideBranding })}
              className={`w-12 h-7 rounded-full p-1 shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${business.hideBranding ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${business.hideBranding ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </Card>

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
