import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) {
    return <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      navigate(user.onboardingComplete ? '/dashboard' : '/onboarding');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="card p-7">
          <h1 className="text-xl font-bold text-center">Welcome back</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Log in to your BusinessHub account</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Email" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            <Input label="Password" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <Link to="/register" className="text-brand-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          Demo: demo@businesshub.app / Demo1234!
        </p>
      </div>
    </div>
  );
}
