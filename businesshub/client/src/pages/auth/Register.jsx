import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../../components/Logo';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/homePath';

const TYPES = [
  { id: 'seller', icon: Store, title: 'I want to sell', text: 'Create a business page, list products and send invoices.' },
  { id: 'buyer', icon: ShoppingBag, title: "I'm a customer", text: 'Find businesses, follow your favourites and leave reviews.' },
];

export default function Register() {
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') === 'buyer' ? 'buyer' : 'seller'; // /register?type=buyer links straight to the customer form
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  if (!authLoading && user) return <Navigate to={homeFor(user)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await register({ ...form, accountType: type });
      toast.success(type === 'buyer' ? "Welcome to BusinessHub!" : "Account created! Let's set up your business.");
      navigate(homeFor(created));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="card p-7">
          <h1 className="text-xl font-bold text-center">Create your account</h1>
          <p className="text-sm text-ink-500 text-center mt-1">Free to join. Choose how you will use BusinessHub.</p>

          <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3 mt-5">
            {TYPES.map(({ id, icon: Icon, title, text }) => (
              <button key={id} type="button" role="radio" aria-checked={type === id} onClick={() => setParams(id === 'buyer' ? { type: 'buyer' } : {})}
                className={`text-left rounded-xl border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${type === id ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'border-ink-200 dark:border-ink-700 hover:border-ink-400'}`}>
                <Icon size={20} className={type === id ? 'text-brand-600' : 'text-ink-400'} />
                <p className="font-semibold text-sm mt-2">{title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{text}</p>
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Chidinma Okafor" />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" />
            <Input label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
            <Input label="Confirm password" type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="••••••••" />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account…' : type === 'buyer' ? 'Create customer account' : 'Create seller account'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Already have an account? <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
