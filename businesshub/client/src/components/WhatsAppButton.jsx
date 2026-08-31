import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton({ phone, message, className = '', children = 'Chat on WhatsApp' }) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  const normalized = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  const href = `https://wa.me/${normalized}?text=${encodeURIComponent(message || '')}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn bg-[#25D366] text-white hover:bg-[#1ebe5b] px-4 py-2.5 ${className}`}
    >
      <MessageCircle size={18} />
      {children}
    </a>
  );
}
