# Steps 4 and 5 — Verification workflow, plans and billing

## STEP 5 — Plans, limits and renewals

### The rules (new subscriptions)
| | Free | Starter | Pro |
|---|---|---|---|
| Products | 10 | **100 in total** | Unlimited |
| Invoices / receipts | not included | included (100/month each, unchanged: the notes don't specify) | unlimited |
| AI business chat | not included | included, no monthly cap | included, no monthly cap |
| AI invoice/receipt writing | not included | **50 per month, combined** | no monthly cap |
| AI marketing tools | not included | not included | included |
| Price (env-configurable) | ₦0 | ₦2,000 for 30 days | ₦5,000 for 30 days |

The 7-day Pro trial is kept for every new business, then the business drops to Free.
"Unlimited" on Pro means no monthly quota. A burst limit of 10 AI requests per minute per IP applies to everyone to protect the service; this is the "fair use" the pricing page mentions.

### Existing customers keep their current terms ("grandfathering")
Each subscription records a `policyVersion`. Existing subscriptions are **legacy**: exactly the old limits (Free 10/5/5/15, Starter 150 products etc.). Only subscriptions created after this release are **v2**. Nothing is deleted from anyone. Tested: a record that predates the field is *not* silently moved to v2 (the field deliberately has no schema default). A legacy customer who lets a plan lapse and renews stays legacy.

### Plan checks happen on the server
AI requests are refused before any AI provider is contacted when the plan doesn't include them; capped features are counted per category; a failed AI call is not counted. Invoices and receipts are refused with a clear message on plans that don't include them. Existing invoices/receipts stay viewable and downloadable after a plan lapses; only *creating* new ones is paused.

### Renewals (the Kaycodings problem)
- **Found and fixed:** the Settings page disabled the button for your *current* plan, so a Starter customer could not renew in the app at all. Now it says "Renew (adds 30 days)".
- Renewing early now **adds 30 days to the end date** instead of restarting from today (no more lost days).
- A customer with Pro time left cannot accidentally pay for Starter over it. Switching plans starts a fresh 30 days (no proration).
- In-app reminders: a banner and one notification when 3 days remain, and again after expiry (for 60 days). **No email reminders yet**: they need a scheduler this app doesn't have.
- Still manual: each payment buys 30 days; there is no automatic charge (Paystack subscriptions would be a separate decision).

### Other
- Landing page and Help text now describe what the code really enforces. The landing page previously advertised Starter as "Unlimited products"; it never was.
- Admin overview: "Revenue (paid orders)" relabelled **"Sales recorded by sellers"**, because those figures are entered by sellers, not independently confirmed.
- New optional AI prompt types `invoiceNotes` / `receiptNotes`, and a "✨ Draft notes with AI" button on invoices (receipts: server-side only for now).

### Honest limitations
- The AI chat is free-form, so a Starter user could ask it for marketing text. Only the structured **Marketing tools** page is Pro-only; chat content is not policed.
- Starter invoice/receipt monthly counts (100 each) were kept because your notes don't state them. Tell me if they should change.

## STEP 4 — Business verification

### Flow
1. A business sends a request (registered name required; registration number, website, notes optional) from **Dashboard → Verification**. The business shows "Pending".
2. If a fee is enabled, they pay on Paystack. The payment is confirmed **server-side with Paystack** (amount, currency, request and business all checked). Paying never verifies anyone; it only tells the reviewer the fee arrived.
3. An admin reviews it in **Admin → Verification** and approves or rejects (rejection needs a reason, which the business sees; they can apply again).
4. Admins can also **grant** a badge directly or **remove** one (reason required) from **Admin → Businesses**.
5. Every decision is written to the audit log; the owner gets an in-app notification.
6. The badge appears on storefronts, search cards and the dashboard.

### Safety rules (all tested)
- An owner's request can only ever result in "pending". Only admin-guarded code can set "verified" (a test scans the code for any other path).
- One open request per business (database-enforced). Two admins deciding at once: exactly one wins.
- A payment reference can be recorded once; a second, different payment for the same request is flagged in the server log for a manual refund.
- The Paystack webhook now routes by payment type. **Before this, a verification payment would have been silently dropped as "not a plan payment".**

### The fee is OFF until you confirm it
Until `VERIFICATION_FEE_MINOR` **and** `VERIFICATION_CURRENCY` are set and `VERIFICATION_PAYMENT_ENABLED=true`, requests are free and no payment can be started or accepted. For ₦5,000: `VERIFICATION_FEE_MINOR=500000`, `VERIFICATION_CURRENCY=NGN`. The screens don't promise "lifetime" because that policy isn't confirmed yet.
Decide before enabling: refund policy for rejected applicants (not automated), and whether the fee is charged before or after review.

## Deploy
1. Back up the database. Confirm Steps 1–3 are deployed and `npm run migrate:step2 -- --apply` was run.
2. Deploy server, then client.
3. `cd server && npm run migrate:step5` (dry run), read it, then `npm run migrate:step5 -- --apply`.
4. Remove `PLAN_GRACE_DAYS=7` once Kaycodings has renewed (or leave it; it only affects expired plans).
5. Leave the three `VERIFICATION_*` settings blank for now.
6. Click through as a **new** account (trial, then Free locks), as an **old** account (nothing should change), and as admin (request → approve; hide/restore a review).

## Rollback
Redeploy the previous build. New fields are optional. `policyVersion` and verification records are ignored by older code. Nothing was deleted or rewritten.

## Verified vs not verified
- **Verified:** 123/123 server tests pass (the real handlers run against in-memory stand-ins: plan policies, AI enforcement, renewal maths, payment validation, webhook routing, decision races, audit logging). Client builds; new screens render without errors.
- **Not verified:** nothing has run against a real MongoDB, real Paystack (the verification payment flow in particular), a real browser or phone, or real email. Test the Paystack path in Paystack **test mode** before enabling the fee.
