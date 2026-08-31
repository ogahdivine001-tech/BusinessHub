// Builds a WhatsApp click-to-chat link. No API key required — this is the
// public wa.me deep link, not the WhatsApp Business API.
function buildWhatsAppLink(phone, message) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');
  const normalized = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  const text = encodeURIComponent(message || '');
  return `https://wa.me/${normalized}${text ? `?text=${text}` : ''}`;
}

module.exports = { buildWhatsAppLink };
