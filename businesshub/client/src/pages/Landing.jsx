import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  Store,
  Package,
  FileText,
  Users,
  Sparkles,
  BarChart3,
  MessageCircle,
  Megaphone,
  Check,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: Store,
    title: "A shop link you're proud to share",
    desc: "A mobile-first page for your business, live in minutes. Share it on WhatsApp and Instagram.",
  },
  {
    icon: Package,
    title: "Show off everything you sell",
    desc: "Add your products or services with photos, prices and descriptions.",
  },
  {
    icon: FileText,
    title: "Invoices your customers take seriously",
    desc: "Create professional invoices and receipts in a few taps, ready to download as PDF.",
  },
  {
    icon: Users,
    title: "Never forget a customer or what they bought",
    desc: "See who bought what, and how much each customer has spent, all in one place.",
  },
  {
    icon: Sparkles,
    title: "Captions and ads, written for you",
    desc: "Tell the assistant what you sell and get posts, ads and product descriptions in seconds.",
    highlight: true,
  },
  {
    icon: BarChart3,
    title: "See what is selling",
    desc: "Know your revenue, your best sellers, and how your customer base is growing.",
  },
  {
    icon: MessageCircle,
    title: "Customers message you with one tap",
    desc: "Your WhatsApp number sits right on your business page, so buyers can reach you instantly.",
  },
  {
    icon: Megaphone,
    title: "Promote your business",
    desc: "Get ready-made bios and ad ideas that fit your business.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create your business",
    desc: "Sign up and set up your business profile in minutes.",
  },
  {
    n: "02",
    title: "Add your products or services",
    desc: "Showcase what you sell with photos, prices, and descriptions.",
  },
  {
    n: "03",
    title: "Share your business page",
    desc: "Get a link you can drop in your WhatsApp status and Instagram bio.",
  },
  {
    n: "04",
    title: "Manage customers and sales",
    desc: "Track orders, invoices, and grow with built-in analytics.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    period: "/month",
    features: [
      "10 products",
      "Basic business page",
      "5 invoices/month",
      "Limited AI usage",
      "Basic analytics",
    ],
    cta: "Start Free",
  },
  {
    name: "Starter",
    price: "₦2,000",
    period: "/month",
    features: [
      "Unlimited products",
      "More invoices",
      "Advanced analytics",
      "More AI usage",
      "Custom branding",
    ],
    cta: "Choose Starter",
  },
  {
    name: "Pro",
    price: "₦5,000",
    period: "/month",
    features: [
      "Everything in Starter",
      "Unlimited AI (fair use)",
      "Premium themes",
      "Priority support",
      "Custom domain (soon)",
    ],
    cta: "Choose Pro",
    recommended: true,
  },
];

const FAQS = [
  {
    q: "Do I need any technical skills to use BusinessHub?",
    a: "No. BusinessHub is built for business owners, not developers. You can set up your store and start selling in minutes.",
  },
  {
    q: "Can I use my own WhatsApp number?",
    a: "Yes. Customers can chat with you directly on your existing WhatsApp number with one tap from your business page.",
  },
  {
    q: "Can I upgrade or downgrade my plan anytime?",
    a: "Yes, you can change your plan at any time from your dashboard settings.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use industry-standard encryption, secure authentication, and never share your business data.",
  },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5 cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm sm:text-base pr-4">{q}</h4>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <p className="text-sm text-ink-600 dark:text-ink-400 mt-3">{a}</p>
      )}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none aspect-[4/5] sm:aspect-[1.05] lg:aspect-[1.1]">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-brand-100 via-white to-gold-100 dark:from-brand-950/50 dark:via-ink-900 dark:to-gold-500/10 border border-brand-100 dark:border-ink-800 shadow-[0_30px_80px_rgba(15,23,42,0.12)]" />

      <motion.div
        initial={{ opacity: 0, y: 24, x: -12 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute left-4 top-6 sm:left-8 sm:top-8 w-[62%] card p-4 sm:p-5 shadow-card-hover border-brand-100"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-500 dark:text-ink-400">
              Invoice
            </p>
            <p className="text-sm font-semibold mt-1">INV-4F2A9</p>
          </div>
          <span className="badge bg-brand-50 text-brand-700">Paid</span>
        </div>
        <div className="space-y-2 text-[11px] text-ink-500 dark:text-ink-300">
          <div className="flex justify-between">
            <span>2 × Classic Sneakers</span>
            <span>₦45,000</span>
          </div>
          <div className="flex justify-between">
            <span>1 × Canvas Tote</span>
            <span>₦8,000</span>
          </div>
        </div>
        <div className="border-t border-ink-100 dark:border-ink-700 mt-3 pt-3 flex justify-between items-baseline">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-500 dark:text-ink-400">
            Total
          </span>
          <span className="font-display text-xl font-semibold text-ink-900 dark:text-white">
            ₦53,000
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute right-4 top-14 sm:right-6 sm:top-16 w-[52%] card overflow-hidden shadow-card-hover"
      >
        <div className="bg-gradient-to-r from-ink-950 via-ink-900 to-brand-900 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                Business
              </p>
              <p className="text-sm font-semibold">Divine Fashion</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">
              Live
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl bg-brand-50 aspect-[1.1] flex items-end p-2">
              <span className="text-[10px] font-medium text-brand-700">
                ₦25,000
              </span>
            </div>
            <div className="rounded-xl bg-gold-50 aspect-[1.1] flex items-end p-2">
              <span className="text-[10px] font-medium text-ink-800">
                ₦18,500
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#EAF9EE] px-2.5 py-2 text-[11px] text-ink-700">
            <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center text-white">
              <MessageCircle size={12} />
            </div>
            WhatsApp ready
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 6 }}
        animate={{ opacity: 1, y: 0, rotate: 4 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[82%] card p-4 sm:p-5 border-brand-100 shadow-card-hover"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-ink-500 dark:text-ink-400">
              Growth
            </p>
            <p className="text-lg font-display font-semibold text-ink-900 dark:text-white">
              This month
            </p>
          </div>
          <div className="rounded-full bg-gold-100 text-ink-900 px-2.5 py-1 text-xs font-semibold">
            +64%
          </div>
        </div>

        <div className="flex items-end h-20 gap-2">
          {[35, 55, 42, 68, 85, 76, 94].map((h, index) => (
            <div
              key={h}
              className={`flex-1 rounded-t-xl ${index % 2 === 0 ? "bg-brand-200" : "bg-brand-500"} opacity-90`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute -right-2 bottom-20 sm:bottom-24 bg-gold-400 text-ink-950 rounded-2xl px-3 py-2 shadow-gold-glow"
      >
        <p className="text-[10px] uppercase tracking-[0.16em] text-ink-700">
          Sales
        </p>
        <p className="font-display text-xl font-semibold leading-none">₦1.8M</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute left-2 bottom-16 sm:left-6 sm:bottom-20 rounded-2xl bg-white/90 border border-ink-100 px-3 py-2 shadow-card-hover"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-600">
          AI Assist
        </p>
        <p className="text-sm font-semibold text-ink-900">Auto captions</p>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return (
      <Navigate
        to={user.onboardingComplete ? "/dashboard" : "/onboarding"}
        replace
      />
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(79,158,118,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(232,163,61,0.18),_transparent_30%),#faf8f4] dark:bg-[radial-gradient(circle_at_top_left,_rgba(79,158,118,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(232,163,61,0.12),_transparent_30%),#16211c]">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/40 to-transparent dark:from-ink-950/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm backdrop-blur-sm dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
              <Sparkles size={16} className="text-gold-500" />
              Built for Nigerian businesses
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-ink-900 dark:text-white leading-[1.05] mt-6">
              Your shop, invoices and customers,{" "}
              <span className="text-brand-600 dark:text-brand-300">
                all in one link.
              </span>
            </h1>
            <p className="text-lg text-ink-600 dark:text-ink-300 mt-6 max-w-xl leading-8">
              Set up a professional business page in 30 seconds, send invoices
              that look the part, and keep track of every sale. Built for
              Nigerian businesses, free to start.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 mt-8">
              <Link
                to="/register"
                className="btn-primary text-base px-6 py-3 w-full sm:w-auto"
              >
                Create your free business page <ArrowRight size={18} />
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary text-base px-6 py-3 w-full sm:w-auto"
              >
                See how it works
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-6 mt-8 text-sm text-ink-600 dark:text-ink-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500" /> Free plan
                available
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold-500" /> No code
                needed
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400" /> Works
                with WhatsApp
              </div>
            </div>
          </motion.div>

          <HeroVisual />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">
              Everything you need to run your business
            </h2>
            <p className="text-ink-600 dark:text-ink-400 mt-3">
              One platform, no juggling multiple apps.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`card-interactive p-6 ${f.highlight ? "border-gold-300 dark:border-gold-600/40" : ""}`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.highlight ? "bg-gold-50 dark:bg-gold-500/10" : "bg-brand-50 dark:bg-brand-900/20"}`}
                >
                  <f.icon
                    size={20}
                    className={
                      f.highlight
                        ? "text-gold-600 dark:text-gold-400"
                        : "text-brand-600 dark:text-brand-400"
                    }
                  />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-20 sm:py-28 bg-ink-50 dark:bg-ink-900/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">
              How it works
            </h2>
            <p className="text-ink-600 dark:text-ink-400 mt-3">
              From sign-up to your first sale in four steps.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-display text-5xl font-semibold text-brand-200 dark:text-brand-500">
                  {s.n}
                </span>
                <h3 className="font-semibold mt-3">{s.title}</h3>
                <p className="text-sm text-ink-600 dark:text-ink-400 mt-1.5">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">
              Simple, transparent pricing
            </h2>
            <p className="text-ink-600 dark:text-ink-400 mt-3">
              Start free. Upgrade as your business grows.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`card p-6 relative ${p.recommended ? "ring-2 ring-brand-600 dark:ring-brand-400 shadow-card-hover" : ""}`}
              >
                {p.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-600 text-white">
                    Recommended
                  </span>
                )}
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-semibold">
                    {p.price}
                  </span>
                  <span className="text-sm text-ink-600 dark:text-ink-400">
                    {p.period}
                  </span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300"
                    >
                      <Check
                        size={16}
                        className="text-brand-600 dark:text-brand-400 mt-0.5 shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`w-full mt-6 ${p.recommended ? "btn-primary" : "btn-secondary"}`}
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
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 dark:text-white">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Faq key={f.q} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center rounded-3xl bg-ink-950 p-12 sm:p-16 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gold-400/10 blur-3xl" />
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-white relative">
            Your customers are already on WhatsApp.
          </h2>
          <p className="text-ink-300 mt-3 max-w-xl mx-auto relative">
            Give them a business that looks the part.
          </p>
          <Link
            to="/register"
            className="btn-gold px-6 py-3 mt-8 inline-flex relative"
          >
            Create your free business page <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
