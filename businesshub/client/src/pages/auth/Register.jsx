import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) {
    return <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Let\'s set up your business.');
      navigate('/onboarding');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="card p-7">
          <h1 className="text-xl font-bold text-center">Create your account</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Start building your business online — free</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Full name" required value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Chidinma Okafor" />
            <Input label="Email" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            <Input label="Phone" required value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" />
            <Input label="Password" type="password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
            <Input label="Confirm password" type="password" required value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="••••••••" />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
