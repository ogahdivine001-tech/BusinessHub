import { useState } from "react";
import { Mail, MessageCircle, ChevronDown, HelpCircle } from "lucide-react";
import Modal from "./Modal";

const FAQS = [
  {
    q: "How do I add products to my store?",
    a: 'Go to Products in the sidebar, click "Add Product", fill in the details, and save. It appears on your public storefront immediately.',
  },
  {
    q: "How do customers place orders?",
    a: "Customers can order directly from your public storefront (find your link under My Business), or you can create orders manually from the Orders page.",
  },
  {
    q: "How do I get paid?",
    a: "Set up Paystack in Settings → Subscription to accept card, bank transfer, and mobile money payments directly through BusinessHub.",
  },
  {
    q: "What happens when my free trial ends?",
    a: "You keep full access to your account, but usage limits (products, invoices, AI requests) drop to the Free plan unless you upgrade in Settings → Subscription.",
  },
  {
    q: 'Can I remove the "Powered by BusinessHub" branding?',
    a: "Yes — this is available on the Starter and Pro plans. Enable it under My Business → Appearance once upgraded.",
  },
  {
    q: "How do WhatsApp orders work?",
    a: "When a customer places an order from your storefront, we save it in your Orders page and open WhatsApp with the order details pre-filled so you can confirm with them directly.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink-100 dark:border-ink-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <span className="text-sm font-medium pr-4">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-ink-500 dark:text-ink-400 pb-3 pr-6">
          {a}
        </p>
      )}
    </div>
  );
}

export default function HelpModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Help & Support" size="md">
      <div className="mb-5">
        <p className="text-sm text-ink-500 dark:text-ink-400 flex items-center gap-2">
          <HelpCircle size={15} className="text-brand-600 shrink-0" />
          Quick answers to common questions. Can't find what you need? Reach us
          directly below.
        </p>
      </div>

      <div className="mb-5">
        {FAQS.map((f) => (
          <FaqItem key={f.q} {...f} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="mailto:hello@businesshub.app"
          className="btn-secondary justify-center"
        >
          <Mail size={15} /> Email us
        </a>
        <a
          href="https://wa.me/2348132196409"
          target="_blank"
          rel="noreferrer"
          className="btn bg-[#25D366] text-white hover:bg-[#1ebe5b] justify-center"
        >
          <MessageCircle size={15} /> WhatsApp
        </a>
      </div>
    </Modal>
  );
}
