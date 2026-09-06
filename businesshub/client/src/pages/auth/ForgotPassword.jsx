import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import { authService } from '../../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="card p-7">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-bold">Check your email</h1>
              <p className="text-sm text-ink-500 mt-2">If an account exists for {email}, we've sent password reset instructions.</p>
              <Link to="/login" className="btn-secondary w-full mt-6">Back to login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-center">Forgot your password?</h1>
              <p className="text-sm text-ink-500 text-center mt-1">We'll send you a reset link</p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Input label="Email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <p className="text-center text-sm text-ink-500 mt-6">
                <Link to="/login" className="text-brand-600 font-medium hover:underline">Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
