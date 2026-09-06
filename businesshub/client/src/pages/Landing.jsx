import { motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight, Store, Package, FileText, Users, Sparkles, BarChart3,
  MessageCircle, Megaphone, Check, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: Store, title: 'Business Website', desc: 'A beautiful, mobile-first public page for your business — live in minutes.' },
  { icon: Package, title: 'Product Management', desc: 'Add, organize, and showcase unlimited products or services.' },
  { icon: FileText, title: 'Invoices & Receipts', desc: 'Create professional invoices and receipts, downloadable as PDF.' },
  { icon: Users, title: 'Customer Management', desc: 'Track customers, purchase history, and total spend in one place.' },
  { icon: Sparkles, title: 'AI Business Assistant', desc: 'Generate captions, ads, and descriptions in seconds with AI.', highlight: true },
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
        <h4 className="font-medium text-sm sm:text-base pr-4">{q}</h4>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <p className="text-sm text-ink-500 dark:text-ink-400 mt-3">{a}</p>}
    </div>
  );
}

// Grounded in the actual product output — an invoice and a storefront
// preview, overlapping like real documents on a desk — instead of a
// generic "browser chrome with fake charts" mockup.
function HeroVisual() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none aspect-[4/5] sm:aspect-square lg:aspect-[4/5]">
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ duration: 0.6 }}
        className="absolute top-2 left-2 sm:left-6 w-[78%] card p-5 shadow-card-hover"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-ink-400">Invoice</p>
            <p className="text-sm font-semibold">INV-4F2A9</p>
          </div>
          <span className="badge bg-brand-50 text-brand-700">Paid</span>
        </div>
        <div className="space-y-2 text-xs text-ink-500 mb-4">
          <div className="flex justify-between"><span>2 × Classic Sneakers</span><span>₦45,000</span></div>
          <div className="flex justify-between"><span>1 × Canvas Tote</span><span>₦8,000</span></div>
        </div>
        <div className="border-t border-ink-100 pt-3 flex justify-between items-baseline">
          <span className="text-xs text-ink-400">Total</span>
          <span className="font-display text-xl font-semibold text-ink-900">₦53,000</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 6 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="absolute bottom-2 right-2 sm:right-4 w-[70%] card p-4 shadow-card-hover"
      >
        <p className="text-[11px] text-ink-400 mb-3">Divine Fashion — Store</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-brand-50 aspect-square flex items-end p-2">
            <span className="text-[10px] font-medium text-brand-700">₦25,000</span>
          </div>
          <div className="rounded-lg bg-gold-50 aspect-square flex items-end p-2">
            <span className="text-[10px] font-medium text-gold-600">₦18,500</span>
          </div>
        </div>
        <div className="btn bg-[#25D366] text-white text-[11px] py-1.5 w-full mt-3">
          <MessageCircle size={12} /> Chat on WhatsApp
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold-400 text-ink-950 rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-gold-glow"
      >
        <span className="text-lg font-display font-semibold leading-none">+64%</span>
        <span className="text-[9px] mt-0.5">this month</span>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to={user.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-50 dark:bg-ink-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight text-ink-900 dark:text-white leading-[1.1]">
              Run your business. Build your brand. Grow faster.
            </h1>
            <p className="text-lg text-ink-600 dark:text-ink-400 mt-6 max-w-lg">
              BusinessHub gives small businesses everything they need to build an online presence, manage customers, create invoices, showcase products, and grow — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 mt-8">
              <Link to="/register" className="btn-primary text-base px-6 py-3 w-full sm:w-auto">
                Start Free <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn-secondary text-base px-6 py-3 w-full sm:w-auto">
                Explore Features
              </a>
            </div>
            <p className="text-sm text-ink-400 mt-6">No card required · Free 30-day trial of every plan</p>
          </motion.div>

          <HeroVisual />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">Everything you need to run your business</h2>
            <p className="text-ink-500 dark:text-ink-400 mt-3">One platform, no juggling multiple apps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`card-interactive p-6 ${f.highlight ? 'border-gold-300 dark:border-gold-600/40' : ''}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.highlight ? 'bg-gold-50 dark:bg-gold-500/10' : 'bg-brand-50 dark:bg-brand-900/20'}`}>
                  <f.icon size={20} className={f.highlight ? 'text-gold-600' : 'text-brand-600'} />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-ink-50 dark:bg-ink-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">How it works</h2>
            <p className="text-ink-500 dark:text-ink-400 mt-3">From sign-up to your first sale in four steps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-semibold text-brand-200 dark:text-brand-800">{s.n}</span>
                <h3 className="font-semibold mt-3">{s.title}</h3>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">Simple, transparent pricing</h2>
            <p className="text-ink-500 dark:text-ink-400 mt-3">Start free. Upgrade as your business grows.</p>
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
                  <span className="font-display text-3xl font-semibold">{p.price}</span>
                  <span className="text-sm text-ink-500">{p.period}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
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
      <section id="faq" className="py-20 sm:py-28 bg-ink-50 dark:bg-ink-900/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => <Faq key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center rounded-3xl bg-ink-950 p-12 sm:p-16 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gold-400/10 blur-3xl" />
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white relative">Ready to take your business online?</h2>
          <p className="text-ink-300 mt-3 max-w-xl mx-auto relative">Join business owners across Nigeria already growing with BusinessHub.</p>
          <Link to="/register" className="btn-gold px-6 py-3 mt-8 inline-flex relative">
            Create Your Business <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
