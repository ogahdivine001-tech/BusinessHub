import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import { authService } from '../../services/authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkProblem, setLinkProblem] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLinkProblem(false);
    setLoading(true);
    try {
      await authService.resetPassword({ token, password, confirmPassword });
      toast.success('Password reset. Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message);
      if (/invalid or has expired/i.test(err.message)) setLinkProblem(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="card p-7">
          <h1 className="text-xl font-bold text-center">Reset your password</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {!searchParams.get('token') && (
              <Input label="Reset token" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the token from your email" />
            )}
            <Input label="New password" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <Input label="Confirm new password" type="password" required minLength={8} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
          {linkProblem && (
            <p className="text-center text-sm text-ink-600 dark:text-ink-400 mt-4">
              This link has expired or was already used.{' '}
              <Link to="/forgot-password" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Request a new link</Link>
            </p>
          )}
          <p className="text-center text-sm text-ink-600 dark:text-ink-400 mt-6">
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
