# Step 2 — Foundation: roles, email verification, delivery, data models

Additive only. No existing field was removed or renamed, no existing user was
changed, and buyer sign-up is OFF by default.

## What changed

| # | Change | Where |
|---|--------|-------|
| 1 | **`buyer` role added.** `owner` (seller) and `admin` are untouched; default role is still `owner`. Buyers are refused by `requireBusiness` and `createBusiness`. | `models/User.js`, `middleware/requireBusiness.js`, `controllers/businessController.js` |
| 2 | **Buyer sign-up is behind `ENABLE_BUYER_SIGNUP`** (default off). The role is chosen from a fixed list server-side; a request can never create an admin. Buyers don't get the seller onboarding email. | `controllers/authController.js`, validators |
| 3 | **Email verification (offered, never forced).** New accounts get a link; single-use, expires in 24 h, only a hash is stored; resend from Settings → Profile (limited to 5/hour). Links use `CLIENT_URL`, never request headers. Login is NOT blocked for unverified accounts. | `authController`, `emailService`, `routes/authRoutes.js`, client `VerifyEmail.jsx`, `Settings.jsx` |
| 4 | **Delivery settings.** `delivery.status` = `unspecified` (default for every existing business) / `available` / `unavailable`, plus optional areas, terms, contact. Validated server-side; details cleared when delivery is off; no fees or times are invented. Editable in My Business; shown on the storefront only when the business has said so. | `Business` model, `utils/deliverySettings.js`, `MyBusiness.jsx`, `Store.jsx` |
| 5 | **New fields on Business** for later steps: `verification.status`, `ratingAverage`, `ratingCount`, `followerCount`. Not in the owner update allow-list, so a business can't edit its own badge or ratings (tested). | `models/Business.js` |
| 6 | **New models (no endpoints yet):** `Review` (1–5 whole stars, unique per account+business, no "verified purchase" claim), `Follow` (unique per account+business), `VerificationRequest` (one pending request per business; payment reference usable once). | `models/` |
| 7 | **Verification fee config** with no assumed currency; payment stays off until amount + currency are set and `VERIFICATION_PAYMENT_ENABLED=true`. | `config/verification.js` |
| 8 | **Migration script** that fills missing new fields on existing businesses. Dry run by default; never overwrites. | `scripts/migrate-step2.js` |

## Deploy steps (in order)
1. Back up the database.
2. Set on the server: `PLAN_GRACE_DAYS=7` (first deploy only, so Kaycodings has until ~1 Nov to renew; remove afterwards), and keep `ENABLE_BUYER_SIGNUP=false`.
3. Deploy server, then client.
4. `cd server && npm run migrate:step2` — read the dry-run output.
5. `npm run migrate:step2 -- --apply`. Run it again; it should report 0 missing.
6. Check: log in as an existing account; open My Business → Delivery; save; open the public storefront; request a verification email from Settings and click the link once (a second click should say "invalid or already used").

## Rollback
Redeploy the previous build. New fields are optional and ignored by old code. The
migration only adds fields, so there is nothing to undo.

## Verified vs not verified
- Verified: 53/53 server tests pass (17 original + 20 Step 1 + 16 Step 2); client builds.
- **Not verified:** anything against a real MongoDB, a real email provider, or a real browser. In particular: that the verification email arrives and renders, that the migration behaves on production data (use the dry run), and the new UI on a phone.

## Known, not yet addressed
- The public storefront response includes the business's internal `owner` id; a public-fields allow-list is planned with the discovery work (Step 3).
- The login token is also kept in `localStorage` (`bh_token`) in addition to the cookie; consider dropping it later (XSS exposure).
- Resetting a password does not log out sessions that already exist.
- Review, follow, search, ranking and verification **endpoints and screens** come next; the models above are the groundwork.
