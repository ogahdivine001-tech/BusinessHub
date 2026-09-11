const SECTIONS = [
  {
    title: "1. Acceptance of these Terms",
    body: `By creating an account, accessing, or using BusinessHub ("the Service", "we", "us", "our"), you agree to be bound by these Terms of Service. If you're accepting on behalf of a business, you confirm you have the authority to bind that business to these Terms. If you don't agree, please don't use the Service.`,
  },
  {
    title: "2. What BusinessHub Is",
    body: `BusinessHub is a platform that lets small businesses create an online presence, manage products and orders, generate invoices and receipts, communicate with customers, and use AI tools to assist with marketing and business content. It is provided on an "as is" and "as available" basis, and features may be added, changed, or removed over time.`,
  },
  {
    title: "3. Your Account",
    body: `You must provide accurate information when registering and keep your login credentials confidential. You're responsible for all activity that happens under your account. Tell us immediately if you suspect unauthorized access. We may suspend or terminate accounts that violate these Terms, provide false information, or are used for fraudulent or abusive purposes.`,
  },
  {
    title: "4. Subscription Plans, Free Trial & Billing",
    body: `New businesses receive a 30-day trial with full Pro-tier features. After the trial, your account continues on the Free plan unless you subscribe to Starter or Pro. Paid subscriptions are billed monthly through our payment processor, Paystack. Prices are shown in Naira (₦) and may change with notice. You can cancel or downgrade at any time from your account settings; downgrades take effect at the end of the current billing period. We don't store your card details — all payment processing is handled directly by Paystack under its own terms and security standards.`,
  },
  {
    title: "5. Acceptable Use",
    body: `You agree not to use BusinessHub to: sell illegal goods or services; commit fraud or deceive customers; send spam or unsolicited messages; infringe on others' intellectual property; upload malicious code; misuse the AI Assistant to generate unlawful, deceptive, or harmful content; or attempt to disrupt, reverse-engineer, or gain unauthorized access to the Service. We may remove content or suspend accounts that violate this section.`,
  },
  {
    title: "6. Your Content & Business Data",
    body: `You retain ownership of the content you upload — product listings, images, business information, and the data of your own customers that you enter into the platform. By uploading content, you grant BusinessHub a limited license to store, display, and process it solely to operate the Service (for example, showing your products on your public storefront). For the personal data of your customers that you collect through BusinessHub, you act as the data controller and BusinessHub acts as a data processor on your behalf — you're responsible for having a lawful basis to collect and store that data.`,
  },
  {
    title: "7. AI-Generated Content",
    body: `BusinessHub's AI Assistant and Marketing tools generate suggestions — product descriptions, captions, ad copy, and similar content — using third-party AI providers. AI output can be inaccurate, generic, or unsuitable for your specific context. You're responsible for reviewing and editing AI-generated content before publishing or sending it, including for factual accuracy and compliance with advertising regulations.`,
  },
  {
    title: "8. Public Storefronts & Customer Orders",
    body: `Every business gets a public storefront page that customers can browse and place orders from. Orders placed through your storefront (including via the WhatsApp order flow) are between you and your customer — BusinessHub facilitates the connection but is not a party to the sale, does not guarantee order fulfillment, and is not responsible for disputes between you and your customers.`,
  },
  {
    title: "9. Third-Party Services",
    body: `BusinessHub integrates with third-party services to operate, including Paystack (payments), Cloudinary (image hosting), an AI provider for content generation, and email delivery infrastructure. Your use of features relying on these services is also subject to those providers' own terms. We aren't responsible for outages, errors, or policy changes on their end.`,
  },
  {
    title: "10. Intellectual Property",
    body: `The BusinessHub name, logo, design, and underlying software are owned by BusinessHub and protected by applicable intellectual property laws. Nothing in these Terms grants you rights to our branding or code beyond what's needed to use the Service as intended.`,
  },
  {
    title: "11. Termination",
    body: `You may stop using BusinessHub and close your account at any time. We may suspend or terminate your account for violating these Terms, non-payment of subscription fees, or extended inactivity, with notice where reasonably possible. On termination, your public storefront will no longer be accessible; we may retain certain records as required by law or as described in our Privacy Policy.`,
  },
  {
    title: "12. Disclaimers & Limitation of Liability",
    body: `The Service is provided without warranties of any kind, express or implied, including fitness for a particular purpose or uninterrupted availability. To the maximum extent permitted by law, BusinessHub is not liable for indirect, incidental, or consequential damages arising from your use of the Service, including lost sales, lost data, or business interruption. Nothing here limits liability that cannot be limited under Nigerian law.`,
  },
  {
    title: "13. Changes to These Terms",
    body: `We may update these Terms from time to time. If we make material changes, we'll make reasonable efforts to notify you (such as an in-app notice or email). Continued use of BusinessHub after changes take effect means you accept the updated Terms.`,
  },
  {
    title: "14. Governing Law",
    body: `These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms or your use of the Service will be subject to the exclusive jurisdiction of the courts of Nigeria.`,
  },
  {
    title: "15. Contact Us",
    body: `Questions about these Terms? Reach us at businesshubng@zohomail.com.`,
  },
];

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-900 dark:text-white">
        Terms of Service
      </h1>
      <p className="text-sm text-ink-500 mt-3">Last updated: September 2026</p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">
              {s.title}
            </h2>
            <p className="text-ink-600 dark:text-ink-400 leading-relaxed">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
