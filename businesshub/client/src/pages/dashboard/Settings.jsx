import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, Sparkles } from 'lucide-react';
import Card from '../../components/Card';
import Input from '../../components/Input';
import UsageBar from '../../components/UsageBar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { settingsService } from '../../services/settingsService';
import { subscriptionService } from '../../services/subscriptionService';

const TABS = ['Profile', 'Security', 'Subscription', 'Appearance'];

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Profile';
  const [tab, setTab] = useState(initialTab);
  const [profile, setProfile] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [subscription, setSubscription] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === 'Subscription') {
      subscriptionService.getMine().then(setSubscription).catch((e) => toast.error(e.message));
    }
  }, [tab]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await settingsService.updateProfile(profile);
      setUser(updated);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.changePassword(pwd);
      toast.success('Password changed.');
      setPwd({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const upgrade = async (plan) => {
    try {
      const { authorization_url } = await subscriptionService.checkout(plan);
      window.location.href = authorization_url;
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-100 dark:border-gray-800 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <Card className="p-6">
          <form onSubmit={saveProfile} className="space-y-4">
            <Input label="Full name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <Input label="Email" value={user?.email} disabled className="opacity-60" />
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
          </form>
        </Card>
      )}

      {tab === 'Security' && (
        <Card className="p-6">
          <form onSubmit={changePassword} className="space-y-4">
            <Input label="Current password" type="password" required value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
            <Input label="New password" type="password" required minLength={8} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Updating…' : 'Change password'}</button>
          </form>
        </Card>
      )}

      {tab === 'Subscription' && (
        <div className="space-y-4">
          <Card className="p-6">
            {subscription?.trial?.active ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-brand-600" />
                  <p className="text-sm font-medium text-brand-600">Free Pro trial — {subscription.trial.daysLeft} day{subscription.trial.daysLeft === 1 ? '' : 's'} left</p>
                </div>
                <p className="text-2xl font-bold mt-1">All Pro features unlocked</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your trial ends {new Date(subscription.trial.endsAt).toLocaleDateString()}. After that you'll drop to the <span className="font-medium capitalize">{subscription?.subscription?.plan || 'free'}</span> plan unless you subscribe.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">Current plan</p>
                <p className="text-2xl font-bold capitalize mt-1">{subscription?.subscription?.plan || 'Free'}</p>
              </>
            )}
          </Card>

          {subscription?.usage && subscription?.limits && (
            <Card className="p-6 space-y-5">
              <h3 className="font-semibold">Usage this month</h3>
              <UsageBar label="Products" used={subscription.usage.products} limit={subscription.limits.products} />
              <UsageBar label="Invoices" used={subscription.usage.invoicesThisMonth} limit={subscription.limits.invoicesPerMonth} />
              <UsageBar label="Receipts" used={subscription.usage.receiptsThisMonth} limit={subscription.limits.receiptsPerMonth} />
              <UsageBar label="AI requests" used={subscription.usage.aiThisMonth} limit={subscription.limits.aiPerMonth} />
            </Card>
          )}

          {!subscription?.paystackConfigured && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Payments aren't set up yet on this server. Add <code className="font-mono text-xs">PAYSTACK_SECRET_KEY</code> and <code className="font-mono text-xs">PAYSTACK_PUBLIC_KEY</code> to <code className="font-mono text-xs">server/.env</code> and restart to enable upgrades.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {['starter', 'pro'].map((plan) => {
              const isCurrent = subscription?.subscription?.plan === plan;
              const disabled = isCurrent || !subscription?.paystackConfigured;
              return (
                <Card key={plan} className="p-6">
                  <h3 className="font-semibold capitalize">{plan}</h3>
                  <p className="text-2xl font-bold mt-1">{plan === 'starter' ? '₦2,000' : '₦5,000'}<span className="text-sm text-gray-500">/month</span></p>
                  <button onClick={() => upgrade(plan)} disabled={disabled} className="btn-primary w-full mt-4">
                    {isCurrent ? <><Check size={16} /> Current plan</> : !subscription?.paystackConfigured ? 'Payments not set up' : 'Upgrade'}
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'Appearance' && (
        <Card className="p-6 flex items-center justify-between">
          <div>
            <p className="font-medium">Dark mode</p>
            <p className="text-sm text-gray-500">Switch between light and dark themes.</p>
          </div>
          <button onClick={toggleTheme} className={`w-12 h-7 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-brand-600' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-5' : ''}`} />
          </button>
        </Card>
      )}
    </div>
  );
}
