import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { settingsService } from '../../services/settingsService';

export default function AccountSettings() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { setUser(await settingsService.updateProfile(profile)); toast.success('Profile updated.'); }
    catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  const changePassword = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await settingsService.changePassword(pwd); toast.success('Password changed.'); setPwd({ currentPassword: '', newPassword: '' }); }
    catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };
  const sendVerification = async () => {
    setSending(true);
    try { const res = await authService.requestEmailVerification(); toast.success(res.message || 'Verification email sent.'); }
    catch (err) { toast.error(err.message); } finally { setSending(false); }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <Input label="Full name" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
          <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <Input label="Email" value={user?.email || ''} disabled className="opacity-60" />
          <div className="flex flex-wrap items-center gap-3 -mt-2 text-sm">
            {user?.emailVerified ? <span className="text-brand-600 font-medium">✓ Email confirmed</span> : (
              <><span className="text-ink-500">Email not confirmed yet.</span>
                <button type="button" onClick={sendVerification} disabled={sending} className="text-brand-600 dark:text-brand-400 font-medium hover:underline disabled:opacity-60">{sending ? 'Sending…' : 'Send confirmation email'}</button></>
            )}
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <Input label="Current password" type="password" required value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
          <Input label="New password" type="password" required minLength={8} value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Updating…' : 'Change password'}</button>
        </form>
      </Card>
    </div>
  );
}
