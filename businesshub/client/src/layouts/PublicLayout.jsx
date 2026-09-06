import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../components/Logo';

const LINKS = [
  { to: '/#features', label: 'Features' },
  { to: '/#pricing', label: 'Pricing' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/#faq', label: 'FAQ' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-ink-950">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-ink-950/80 backdrop-blur-md border-b border-ink-100 dark:border-ink-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <a key={l.to} href={l.to} className="text-sm font-medium text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="btn-ghost">Login</button>
            <button onClick={() => navigate('/register')} className="btn-primary">Get Started</button>
          </div>
          <button className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-ink-100 dark:border-ink-800 px-4 py-4 space-y-3">
            {LINKS.map((l) => (
              <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="block text-sm font-medium text-ink-700 dark:text-ink-300">
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/login')} className="btn-secondary flex-1">Login</button>
              <button onClick={() => navigate('/register')} className="btn-primary flex-1">Get Started</button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="text-sm text-ink-500 dark:text-ink-400 mt-3">Everything your business needs, in one place.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-ink-500 dark:text-ink-400">
              <li><a href="/#features" className="hover:text-ink-900 dark:hover:text-white">Features</a></li>
              <li><a href="/#pricing" className="hover:text-ink-900 dark:hover:text-white">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-ink-500 dark:text-ink-400">
              <li><Link to="/about" className="hover:text-ink-900 dark:hover:text-white">About</Link></li>
              <li><Link to="/contact" className="hover:text-ink-900 dark:hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-ink-500 dark:text-ink-400">
              <li><Link to="/privacy" className="hover:text-ink-900 dark:hover:text-white">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-ink-900 dark:hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-ink-100 dark:border-ink-800 py-6 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} BusinessHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
