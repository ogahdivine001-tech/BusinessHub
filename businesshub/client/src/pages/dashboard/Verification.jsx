import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import LoadingSpinner from '../../components/LoadingSpinner';
import { verificationService } from '../../services/verificationService';

const money = (minor, currency) => {
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100); } catch { return `${minor / 100} ${currency}`; }
};

export default function Verification() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ legalName: '', registrationNumber: '', website: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = () => verificationService.mine().then(setData).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await verificationService.request(form);
      toast.success('Request sent. We will review it soon.');
      await load();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const pay = async () => {
    setBusy(true);
    try {
      const d = await verificationService.pay();
      window.location.href = d.authorization_url; // Paystack's own payment page
    } catch (err) { toast.error(err.message); setBusy(false); }
  };

  if (!data) return <div className="p-8 flex justify-center"><LoadingSpinner size={28} /></div>;
  const { status, request, fee } = data;
  const pending = request?.status === 'pending';
  const lastDecisionReason = request && ['rejected', 'revoked'].includes(request.status) ? request.decision?.reason : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BadgeCheck className="text-brand-600" size={26} /> Business verification</h1>
      <p className="text-ink-500 text-sm mt-1">A verified badge shows customers that BusinessHub has checked your business details.</p>

      {status === 'verified' && (
        <Card className="p-6 mt-6 border-brand-200">
          <div className="flex items-center gap-3"><BadgeCheck size={28} className="text-brand-600" />
            <div><p className="font-semibold">Your business is verified</p>
              <p className="text-sm text-ink-500">The badge shows on your storefront, in search results and on your business card{data.verifiedAt ? ` (since ${new Date(data.verifiedAt).toLocaleDateString('en-GB')})` : ''}.</p></div>
          </div>
        </Card>
      )}

      {pending && (
        <Card className="p-6 mt-6 space-y-3">
          <div className="flex items-center gap-3"><Clock size={24} className="text-gold-500" />
            <div><p className="font-semibold">Your request is waiting for review</p>
              <p className="text-sm text-ink-500">Submitted {new Date(request.createdAt).toLocaleDateString('en-GB')}. Our team checks each request by hand, and you will be notified of the decision.</p></div>
          </div>
          {fee.enabled && request.payment?.status !== 'paid' && (
            <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-4">
              <p className="text-sm">A verification fee of <strong>{money(fee.amountMinor, fee.currency)}</strong> is required before we review your request. Paying the fee does not guarantee verification.</p>
              <button onClick={pay} disabled={busy || !data.paystackConfigured} className="btn-primary mt-3">{busy ? 'Opening payment…' : `Pay ${money(fee.amountMinor, fee.currency)}`}</button>
            </div>
          )}
          {fee.enabled && request.payment?.status === 'paid' && <p className="text-sm text-brand-600">✓ Fee received. Waiting for an administrator to review your request.</p>}
        </Card>
      )}

      {data.canRequest && (
        <>
          {lastDecisionReason && (
            <Card className="p-4 mt-6 flex gap-3"><ShieldAlert className="text-amber-600 shrink-0" size={20} />
              <div className="text-sm"><p className="font-medium">{request.status === 'revoked' ? 'Your badge was removed' : 'Your last request was not approved'}</p>
                <p className="text-ink-500 mt-0.5">{lastDecisionReason}</p><p className="text-ink-500 mt-1">You can apply again once this is addressed.</p></div>
            </Card>
          )}
          <form onSubmit={submit} className="card p-6 mt-6 space-y-4">
            <h2 className="font-semibold">Request verification</h2>
            <Input label="Registered business name *" value={form.legalName} maxLength={200} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
            <Input label="Registration number (e.g. CAC), if you have one" value={form.registrationNumber} maxLength={100} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
            <Input label="Website or social page, if you have one" type="url" placeholder="https://" value={form.website} maxLength={300} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <Textarea label="Anything else that helps us confirm your business (optional)" rows={3} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {fee.enabled && <p className="text-sm text-ink-500">A verification fee of {money(fee.amountMinor, fee.currency)} applies. You will be asked to pay after submitting.</p>}
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Sending…' : 'Send request'}</button>
          </form>
        </>
      )}

      <p className="text-xs text-ink-400 mt-6">Only BusinessHub administrators can approve a badge. A badge can be removed if the details you gave turn out to be wrong.</p>
    </div>
  );
}
