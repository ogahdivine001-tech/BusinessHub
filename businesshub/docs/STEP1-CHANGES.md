# Step 1 — Stability & security fixes

Scope: fixes that need no product decisions. No database schema changes that
affect existing records, no data migration, no feature removals.

## What changed

| # | Fix | Where |
|---|-----|-------|
| 1 | **Paid plans now expire.** `getEffectivePlan` honours `currentPeriodEnd`. Cancelled plans keep access until the period ends. Legacy paid rows with no end date keep access (unless cancelled). Optional `PLAN_GRACE_DAYS`. Dashboard shows the plan actually in force plus an "ended" notice. | `services/subscriptionService.js`, `controllers/subscriptionController.js`, `client/.../Settings.jsx` |
| 2 | **Invoice/receipt PDF links are signed and expiring.** Customer-facing links need a token; a bad token is always refused, before any database lookup. Old unsigned links keep working while `LEGACY_PUBLIC_PDF_LINKS` is not `false`. | `utils/signedLink.js`, invoice/receipt controllers, client services |
| 3 | **Limits can't be beaten by simultaneous requests** (products, invoices, receipts, AI). Create, then verify, roll back if over. AI uses are reserved before the provider call and given back if it fails. | `services/usageGuard.js`, controllers |
| 4 | **Tenant isolation on documents.** Invoice/receipt `customer` and `invoice`, and a product's `category`, must belong to the caller's business. | controllers |
| 5 | **Input validation.** Item descriptions, quantities and prices, discount, tax, due date and invoice status are validated server-side; products use an explicit field allow-list. | `utils/documentInput.js`, controllers |
| 6 | **Admin audit log upgraded.** Entries now include reason, IP and before/after values, are append-only at the application layer, and are readable at `GET /api/admin/audit-logs`. Admins can't deactivate themselves; toggles must be real booleans. | `models/AdminLog.js`, `controllers/adminController.js`, `routes/adminRoutes.js` |
| 7 | **Admin counts respect expiry** ("active subscriptions"); business list adds `effectivePlan` / `planExpired`. | `controllers/adminController.js` |
| 8 | **CORS from configuration.** `ALLOWED_ORIGINS`; localhost only outside production. The original live origin remains as a fallback until `ALLOWED_ORIGINS` is set. | `config/cors.js`, `app.js` |
| 9 | **Read-only report** of who would drop to Free: `npm run audit:subscriptions`. | `scripts/audit-subscriptions.js` |

## New environment variables (all optional)
`ALLOWED_ORIGINS`, `DOC_LINK_SECRET` (falls back to `JWT_SECRET`), `DOC_LINK_TTL_DAYS` (90), `LEGACY_PUBLIC_PDF_LINKS` (true), `PLAN_GRACE_DAYS` (0). See `server/.env.example`.

## Before you deploy
1. **Rotate every credential** that was in the shared `.env` (Mongo user password, Cloudinary, Resend, SMTP, AI keys, Paystack, JWT secret).
2. **Back up the database.**
3. Run `npm run audit:subscriptions` against production and read the "WILL DROP TO FREE" list. Those businesses lose paid access on deploy. Decide whether to extend them first (Admin → set plan) or notify them.
4. Deploy server, then client. The client and server must go together: the new client sends signed links; an old client still works because legacy links stay allowed.
5. Later: once customers have had time to receive refreshed links, set `LEGACY_PUBLIC_PDF_LINKS=false`.

## Rollback
No data was migrated. Redeploy the previous build to roll back. New audit-log fields are optional and old rows are unaffected.

## Verified vs not verified
- Verified: 37/37 server tests pass (17 existing + 20 new); client builds; app boots and unauthenticated/forged requests get 401/403 as expected.
- **Not verified:** controllers against a real MongoDB (none available in the build sandbox); payment flow against Paystack; real-browser PDF download; the legacy-link switch in production. Test these on staging.

## Known, not yet addressed (planned later steps)
- Renewal pays from "now", so paying early forfeits the remaining days of the current period.
- Receipts can be created without a paid invoice (a receipt is the owner's own record; payment confirmation rules belong in the receipts/invoices step).
- The audit log's append-only rule is enforced by the app; also restrict the DB user's rights if your host allows.
- The error handler logs full stack traces for expected 4xx errors (noisy logs).
