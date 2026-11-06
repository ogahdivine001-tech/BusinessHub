import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, HeartHandshake, MailCheck, MessageSquareText, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { engageService } from '../../services/engageService';

export default function AccountHome() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ following: null, reviews: null });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const isBuyer = user?.role === 'buyer';

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([engageService.following(1), engageService.myReviews(1)]).then(([f, r]) => {
      if (!cancelled) setCounts({ following: f.status === 'fulfilled' ? f.value.total : null, reviews: r.status === 'fulfilled' ? r.value.total : null });
    });
    return () => { cancelled = true; };
  }, []);

  const sendVerification = async () => {
    setSending(true);
    try { const res = await authService.requestEmailVerification(); toast.success(res.message || 'Verification email sent.'); }
    catch (err) { toast.error(err.message); } finally { setSending(false); }
  };
  const becomeSeller = async () => {
    setBusy(true);
    try {
      const updated = await authService.becomeSeller();
      setUser(updated);
      toast.success("You're now a seller. Let's set up your business.");
      navigate('/onboarding');
    } catch (err) { toast.error(err.message); setBusy(false); }
  };

  const tile = (to, Icon, label, value) => (
    <Link to={to} className="card p-5 hover:shadow-md transition-shadow block">
      <Icon size={20} className="text-brand-600" />
      <p className="text-2xl font-bold mt-3">{value ?? '–'}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi {user?.fullName?.split(' ')[0] || 'there'} 👋</h1>
        <p className="text-ink-500 mt-1">Find businesses you can trust, follow the ones you like and share what you think.</p>
      </div>

      {!user?.emailVerified && (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 dark:border-amber-800">
          <p className="text-sm flex items-center gap-2"><MailCheck size={18} className="text-amber-600 shrink-0" /> Confirm your email address to write reviews.</p>
          <button onClick={sendVerification} disabled={sending} className="btn-secondary text-sm">{sending ? 'Sending…' : 'Send confirmation email'}</button>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {tile('/discover', Compass, 'Discover businesses', 'Browse')}
        {tile('/account/following', HeartHandshake, 'Businesses you follow', counts.following)}
        {tile('/account/reviews', MessageSquareText, 'Reviews you wrote', counts.reviews)}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold">About ordering</h2>
        <p className="text-sm text-ink-500 mt-1">When you order from a business page, the business gets your name and phone number and confirms the order with you directly, usually on WhatsApp. BusinessHub does not take payment for orders, so you agree how to pay and receive your order with the business. You do not need an account to place an order.</p>
      </Card>

      {isBuyer && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Store size={22} className="text-brand-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h2 className="font-semibold">Own a business?</h2>
              <p className="text-sm text-ink-500 mt-1">Turn this account into a seller account to create a business page, list products and send invoices. Your follows and reviews stay.</p>
              {!confirming ? (
                <button onClick={() => setConfirming(true)} className="btn-secondary mt-3 text-sm">Start selling on BusinessHub</button>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm">This switches your account to a seller account.</p>
                  <button onClick={becomeSeller} disabled={busy} className="btn-primary text-sm">{busy ? 'Switching…' : 'Yes, continue'}</button>
                  <button onClick={() => setConfirming(false)} disabled={busy} className="btn-ghost text-sm">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
