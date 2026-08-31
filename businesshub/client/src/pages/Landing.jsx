import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight, Store, Package, FileText, Users, Sparkles, BarChart3,
  MessageCircle, Megaphone, Check, ChevronDown, LayoutDashboard,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FEATURES = [
  { icon: Store, title: 'Business Website', desc: 'A beautiful, mobile-first public page for your business — live in minutes.' },
  { icon: Package, title: 'Product Management', desc: 'Add, organize, and showcase unlimited products or services.' },
  { icon: FileText, title: 'Invoices & Receipts', desc: 'Create professional invoices and receipts, downloadable as PDF.' },
  { icon: Users, title: 'Customer Management', desc: 'Track customers, purchase history, and total spend in one place.' },
  { icon: Sparkles, title: 'AI Business Assistant', desc: 'Generate captions, ads, and descriptions in seconds with AI.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Understand your revenue, best sellers, and customer growth.' },
  { icon: MessageCircle, title: 'WhatsApp Integration', desc: 'Let customers reach you instantly on WhatsApp with one click.' },
  { icon: Megaphone, title: 'Marketing Tools', desc: 'Generate captions, ads, and bios tailored to your business.' },
];

const STEPS = [
  { n: '01', title: 'Create your business', desc: 'Sign up and set up your business profile in minutes.' },
  { n: '02', title: 'Add your products or services', desc: 'Showcase what you sell with photos, prices, and descriptions.' },
  { n: '03', title: 'Share your business page', desc: 'Get a unique link to share on social media and WhatsApp.' },
  { n: '04', title: 'Manage customers and sales', desc: 'Track orders, invoices, and grow with built-in analytics.' },
];

const PLANS = [
  { name: 'Free', price: '₦0', period: '/month', features: ['10 products', 'Basic business page', '5 invoices/month', 'Limited AI usage', 'Basic analytics'], cta: 'Start Free' },
  { name: 'Starter', price: '₦2,000', period: '/month', features: ['Unlimited products', 'More invoices', 'Advanced analytics', 'More AI usage', 'Custom branding'], cta: 'Choose Starter' },
  { name: 'Pro', price: '₦5,000', period: '/month', features: ['Everything in Starter', 'Unlimited AI (fair use)', 'Premium themes', 'Priority support', 'Custom domain (soon)'], cta: 'Choose Pro', recommended: true },
];

const FAQS = [
  { q: 'Do I need any technical skills to use BusinessHub?', a: 'No. BusinessHub is built for business owners, not developers. You can set up your store and start selling in minutes.' },
  { q: 'Can I use my own WhatsApp number?', a: 'Yes. Customers can chat with you directly on your existing WhatsApp number with one tap from your business page.' },
  { q: 'Can I upgrade or downgrade my plan anytime?', a: 'Yes, you can change your plan at any time from your dashboard settings.' },
  { q: 'Is my data secure?', a: 'Yes. We use industry-standard encryption, secure authentication, and never share your business data.' },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5 cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm sm:text-base">{q}</h4>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{a}</p>}
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();

  // If someone is already logged in and lands here — via the sidebar logo,
  // a bookmark, the browser back button, or any other stray link — send
  // them straight back into the app instead of showing the public
  // marketing page, which looks identical to being logged out.
  if (!loading && user) {
    return <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/60 to-transparent dark:from-brand-950/20 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 mb-6">
              Built for Nigerian small businesses
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white max-w-4xl mx-auto leading-tight">
              Run Your Business. Build Your Brand. Grow Faster.
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-6">
              BusinessHub gives small businesses everything they need to build an online presence, manage customers, create invoices, showcase products, and grow their business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link to="/register" className="btn-primary text-base px-6 py-3 w-full sm:w-auto">
                Start Free <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn-secondary text-base px-6 py-3 w-full sm:w-auto">
                Explore Features
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="card p-3 sm:p-4 shadow-card-hover">
              <div className="rounded-xl bg-gray-900 dark:bg-black overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="p-6 sm:p-10 grid grid-cols-4 gap-4">
                  <div className="col-span-4 sm:col-span-1 space-y-2 hidden sm:block">
                    {['Dashboard', 'Products', 'Orders', 'Customers', 'Invoices'].map((i) => (
                      <div key={i} className="text-xs text-gray-400 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50">
                        <LayoutDashboard size={12} /> {i}
                      </div>
                    ))}
                  </div>
                  <div className="col-span-4 sm:col-span-3 grid grid-cols-3 gap-3">
                    {['Revenue', 'Orders', 'Customers'].map((label, i) => (
                      <div key={label} className="bg-gray-800/50 rounded-xl p-4">
                        <p className="text-[10px] text-gray-500">{label}</p>
                        <p className="text-lg font-bold text-white mt-1">{i === 0 ? '₦245,000' : i === 1 ? '128' : '64'}</p>
                        <p className="text-[10px] text-green-400 mt-1">+12.5%</p>
                      </div>
                    ))}
                    <div className="col-span-3 bg-gray-800/50 rounded-xl p-4 h-24 flex items-end gap-1.5">
                      {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 bg-brand-500/70 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Everything you need to run your business</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">One platform, no juggling multiple apps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                className="card p-6 hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-brand-600" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">How it works</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">From sign-up to your first sale in four simple steps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="text-5xl font-extrabold text-brand-100 dark:text-brand-900/50">{s.n}</span>
                <h3 className="font-semibold mt-2">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Simple, transparent pricing</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3">Start free. Upgrade as your business grows.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`card p-6 relative ${p.recommended ? 'ring-2 ring-brand-600 shadow-card-hover' : ''}`}
              >
                {p.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-600 text-white">Recommended</span>
                )}
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span className="text-sm text-gray-500">{p.period}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Check size={16} className="text-brand-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`w-full mt-6 ${p.recommended ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => <Faq key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center card bg-brand-600 border-none p-12 sm:p-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to take your business online?</h2>
          <p className="text-brand-100 mt-3 max-w-xl mx-auto">Join businesses across Nigeria already growing with BusinessHub.</p>
          <Link to="/register" className="btn bg-white text-brand-700 hover:bg-brand-50 px-6 py-3 mt-8 inline-flex">
            Create Your Business <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
