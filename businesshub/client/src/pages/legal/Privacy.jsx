const SECTIONS = [
  {
    title: '1. Introduction',
    body: `This Privacy Policy explains how BusinessHub ("we", "us", "our") collects, uses, and protects information when you use our platform to run your business online. We aim to comply with the principles of the Nigeria Data Protection Act (NDPA) 2023.`,
  },
  {
    title: '2. Information We Collect',
    body: `Account information: your full name, email, phone number, and a hashed version of your password (we never store passwords in plain text). Business information: business name, description, category, logo, cover photo, contact details, and location. Content you create: products, orders, customers, invoices, and receipts you add to the platform. Payment information: subscription payments are processed directly by Paystack — we do not receive or store your card details. Usage data: basic technical data like IP address and browser type, used for security and to keep the Service running reliably.`,
  },
  {
    title: '3. Data About Your Own Customers',
    body: `When you add your customers' names, phone numbers, or other details into BusinessHub (for orders, invoices, or your customer list), you are the data controller for that information and BusinessHub acts as a data processor on your behalf. We store it securely and only use it to provide the Service to you — we don't use your customers' data for our own marketing.`,
  },
  {
    title: '4. How We Use Information',
    body: `We use the information we collect to: operate your account and dashboard; publish your public storefront; process orders and generate invoices/receipts; send account-related emails (like password resets); provide AI-generated content suggestions when you use those tools; monitor for fraud, abuse, and security issues; and improve the Service over time.`,
  },
  {
    title: '5. Third-Party Service Providers',
    body: `We rely on trusted third parties to operate BusinessHub, and your data may pass through their systems: MongoDB Atlas (database hosting), Cloudinary (image storage), Paystack (payment processing), an AI provider (for generating marketing and product content when you use the AI Assistant), and email infrastructure for transactional emails like password resets. Each of these providers has its own privacy and security practices; we choose providers with reasonable security standards but encourage you to review their policies if you have concerns.`,
  },
  {
    title: '6. WhatsApp Integration',
    body: `BusinessHub's "Chat on WhatsApp" and order features use standard WhatsApp click-to-chat links. We don't have access to your WhatsApp messages, and no message content is sent to or stored by BusinessHub through this feature — it simply opens WhatsApp with a pre-filled message.`,
  },
  {
    title: '7. Data Sharing & Disclosure',
    body: `We don't sell your personal data or your customers' data to third parties. We only share data: with the service providers listed above, as needed to operate BusinessHub; if required by law, court order, or to protect the rights, safety, or property of BusinessHub, our users, or the public; or with your consent.`,
  },
  {
    title: '8. Data Security',
    body: `We use industry-standard measures to protect your data, including password hashing, encrypted connections (HTTPS), rate limiting, and access controls that keep each business's data separate from others. No system is 100% secure, but we take reasonable steps to protect your information from unauthorized access, loss, or misuse.`,
  },
  {
    title: '9. Data Retention',
    body: `We keep your account and business data for as long as your account is active. If you close your account, we may retain certain records (like transaction history) for a reasonable period afterward, where needed for legal, accounting, or fraud-prevention purposes.`,
  },
  {
    title: '10. Your Rights',
    body: `You can access and update most of your account and business information directly from your dashboard settings at any time. You may request a copy of your data, ask us to correct inaccurate information, or request deletion of your account by contacting us. We'll respond to reasonable requests within a reasonable timeframe, subject to any legal obligations to retain certain records.`,
  },
  {
    title: '11. Cookies',
    body: `BusinessHub uses a small number of essential cookies and local storage entries to keep you logged in and remember your preferences (like light/dark mode). We don't use third-party advertising or tracking cookies.`,
  },
  {
    title: "12. Children's Privacy",
    body: `BusinessHub is intended for business owners and is not directed at children. We don't knowingly collect personal data from anyone under the age of 18.`,
  },
  {
    title: '13. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. If we make material changes, we'll make reasonable efforts to notify you. The "last updated" date at the top of this page reflects the most recent revision.`,
  },
  {
    title: '14. Contact Us',
    body: `Questions about this policy or how your data is handled? Reach us at businesshubng@zohomail.com.`,
  },
];

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900 dark:text-white">Privacy Policy</h1>
      <p className="text-sm text-ink-500 mt-3">Last updated: September 2026</p>

      <div className="mt-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        This document is a general-purpose draft describing how BusinessHub actually handles data. It isn't a substitute for advice from a qualified Nigerian lawyer or data protection professional — we'd recommend a formal review, especially given real customer data and payments are involved.
      </div>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">{s.title}</h2>
            <p className="text-ink-600 dark:text-ink-400 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}