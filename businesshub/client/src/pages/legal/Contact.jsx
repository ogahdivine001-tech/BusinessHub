import {
  Mail,
  MessageCircle,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";

// Placeholder handles for BusinessHub's own public accounts — update these
// to your real ones before going live.
const SOCIALS = [
  {
    icon: Instagram,
    label: "Instagram",
    href: "https://instagram.com/businesshub",
  },
  { icon: Twitter, label: "Twitter / X", href: "https://x.com/businesshub" },
  {
    icon: Facebook,
    label: "Facebook",
    href: "https://facebook.com/businesshub",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    href: "https://linkedin.com/company/businesshub",
  },
];

export default function Contact() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center">
        Get in touch
      </h1>
      <p className="text-ink-500 dark:text-ink-400 text-center mt-3 max-w-xl mx-auto">
        Have a question, need help with your account, or just want to say hello?
        We'd love to hear from you.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-12">
        <a
          href="mailto:businesshubng@zohomail.com"
          className="card p-6 hover:shadow-card-hover transition-shadow"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
            <Mail size={20} className="text-brand-600" />
          </div>
          <h3 className="font-semibold mb-1">Email us</h3>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            businesshubng@zohomail.com
          </p>
          <p className="text-xs text-ink-400 mt-2">
            We typically reply within 24 hours.
          </p>
        </a>

        <a
          href="https://wa.me/2348132196409"
          target="_blank"
          rel="noreferrer"
          className="card p-6 hover:shadow-card-hover transition-shadow"
        >
          <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 flex items-center justify-center mb-4">
            <MessageCircle size={20} className="text-[#25D366]" />
          </div>
          <h3 className="font-semibold mb-1">Chat on WhatsApp</h3>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            +234 813 219 6409
          </p>
          <p className="text-xs text-ink-400 mt-2">
            Fastest way to reach our support team.
          </p>
        </a>
      </div>

      <div className="card p-6 mt-5">
        <h3 className="font-semibold mb-4">Follow BusinessHub</h3>
        <div className="flex flex-wrap gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ink-200 dark:border-ink-800 text-sm text-ink-600 dark:text-ink-300 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-brand-900/20 transition-colors"
            >
              <s.icon size={16} /> {s.label}
            </a>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-ink-400 mt-10">
        Looking for help with your own storefront's contact details? Head to{" "}
        <a href="/dashboard/business" className="text-brand-600 underline">
          My Business
        </a>{" "}
        in your dashboard instead — this page is for reaching the BusinessHub
        team.
      </p>
    </div>
  );
}
