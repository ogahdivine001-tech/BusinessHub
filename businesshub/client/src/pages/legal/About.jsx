import { Link } from 'react-router-dom';
import { Target, Users, Zap, Heart, ArrowRight } from 'lucide-react';

const VALUES = [
  { icon: Zap, title: 'Built for speed', desc: 'From sign-up to your first sale in minutes, not weeks. No developer needed.' },
  { icon: Heart, title: 'Built for Nigeria', desc: 'Naira pricing, WhatsApp-first commerce, and local payment rails — designed around how business actually happens here.' },
  { icon: Users, title: 'Built for everyone', desc: 'Whether you sell sneakers from your bedroom or run a growing team, BusinessHub scales with you.' },
  { icon: Target, title: 'Built to last', desc: 'Real invoicing, real analytics, real customer data — the tools serious businesses need to grow, not just a pretty storefront.' },
];

export default function About() {
  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">About BusinessHub</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-5 max-w-2xl mx-auto">
          BusinessHub gives small businesses, freelancers, vendors, and entrepreneurs everything they need to build an online presence, manage customers, create invoices, showcase products, and grow — all in one place.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <div className="card p-8 sm:p-10">
          <h2 className="text-xl font-bold mb-3">Why we built this</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Most small business owners aren't short on hustle — they're short on tools that actually fit how they work. A tailor in Ikeja shouldn't need five different apps to take orders, track customers, and send an invoice. A shop owner in Kano shouldn't have to choose between a website that looks professional and one they can actually afford. BusinessHub exists to close that gap: one platform, one login, everything a growing business needs to run online — from a shareable storefront to real analytics, without the enterprise price tag or the learning curve.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-900/40 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">What we stand for</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="card p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
                  <v.icon size={20} className="text-brand-600" />
                </div>
                <h3 className="font-semibold mb-1.5">{v.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to bring your business online?</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-3">Join business owners already growing with BusinessHub — free to start.</p>
        <Link to="/register" className="btn-primary px-6 py-3 mt-6 inline-flex">
          Create Your Business <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
