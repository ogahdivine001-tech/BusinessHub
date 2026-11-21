# Accessibility / responsive pass + Brevo email

Applies on top of the "accounts" release (everything through customer sign-up).
No database changes. No migration. No new npm dependencies.

## 1. Email now goes through Brevo

`server/services/emailService.js` picks the first provider that is fully set up:
**Brevo -> Resend -> SMTP**. Existing deployments keep working until the Brevo
variables are set.

| Variable | Required | Notes |
|---|---|---|
| `BREVO_API_KEY` | yes | A v3 API key from Brevo (SMTP & API -> API Keys) |
| `BREVO_FROM` | yes | Must be a sender or domain you have **verified in Brevo**, or Brevo rejects the email |
| `BREVO_FROM_NAME` | no | Defaults to `BusinessHub` |
| `BREVO_REPLY_TO` | no | e.g. your support inbox; ignored if not a valid email |
| `EMAIL_TIMEOUT_MS` | no | Default 15000. A hung provider can no longer hang a request |

If `BREVO_API_KEY` is set but `BREVO_FROM` is missing or invalid, Brevo is **not**
used and a warning is logged (it never silently half-works).
Errors show Brevo's own message (for example "Sender is not valid") and never
include the API key.

### Deploy checklist (Brevo)
1. In Brevo, add and verify your sending domain (SPF + DKIM DNS records), or at
   least a single verified sender. Without this, mail is rejected or lands in spam.
2. Create the API key. If Brevo's **Authorised IPs** security setting is on, API
   calls from Render will be refused (Render's IPs change): turn it off or allow them.
3. On Render set `BREVO_API_KEY`, `BREVO_FROM` (and optionally `BREVO_FROM_NAME`,
   `BREVO_REPLY_TO`). Redeploy the server.
4. Test: "Forgot password" with your own address; then Settings -> Profile ->
   "Send verification email". In Brevo, check Transactional -> Logs.
5. Once it works, you can delete the old `RESEND_*` / `SMTP_*` values.

Not touched: the `zohomail.com` address on the Contact, Terms and Privacy pages is
your inbox for *receiving* mail, not a sending provider.
Consider adding Brevo to the Privacy Policy as the service that delivers account emails.

## 2. Accessibility fixes (whole site)

- **Form labels.** `Input`, `Select`, `Textarea` now link label to field and announce
  errors (`aria-invalid`, `aria-describedby`). `Input` also forwards refs.
- **Dialogs.** `Modal`, `ConfirmDialog` and the Help window are real dialogs: labelled,
  Escape closes, Tab stays inside, background scroll locks, focus returns to what opened
  them. Stacked dialogs: Escape closes only the top one. Shared hook: `hooks/useDialog.js`.
- **Mobile drawer** (dashboard) uses the same behaviour; hamburger has a name and state.
- **14 unnamed controls named** (row edit/delete buttons, AI send, copy, social links,
  Log out, etc.), with larger tap targets.
- **Contrast.** Muted text (`ink-400` / `ink-500`) failed 4.5:1. They are now CSS variables
  in `index.css` with separate light and dark values (all pairs measured >= 4.5:1).
  Light-mode muted text is slightly darker than before. To tune, edit the two variables.
- **Skip-to-content link** on every layout. **Visible keyboard focus ring** everywhere.
- **Reduced-motion** setting respected.
- **Switches** (dark mode, hide branding) are real switches; theme picker reports selection.
- **Star picker**: one tab stop, arrow keys / Home / End. Rating text reads
  "Rated 4.5 out of 5 stars (12 reviews)". Follow button no longer double-announces state.
  Pagination is a labelled nav and announces page changes. Discover announces result counts.
- FAQ, notifications and line-item rows use real buttons / grouped labels.

## 3. Phone / responsive fixes

- Logo, cover and product-photo controls were **hover-only** (invisible on touch). Now always
  visible and keyboard-reachable. Product photo "remove" is a corner x.
- **Admin area had no navigation below the `lg` breakpoint.** Added a scrollable bar.
- Inputs are 16px on phones, which stops iOS zooming the page on focus.
- Dashboard height uses `dvh` so the mobile browser toolbar does not clip it.
- Auth, order and checkout forms declare `autoComplete` and `inputMode` (password
  managers, autofill, number pad for phone fields).
- Account bar labels (Discover / Help / Seller dashboard) stay available to screen readers
  on phones.

## Behaviour changes to know about
- Notifications: only an unread item's **title** marks it read (it is now a real button).
  Tapping the message body no longer does. "Open" still marks it read.
- Product photos: remove control moved from a hover overlay to a corner button.

## Tests
- Server: **181 / 181** pass (170 existing + 11 new in `tests/brevo.test.js`, which mock the
  network: request shape, priority, bad sender, error handling, key never leaked).
- Client build passes; accessibility linter clean; scan finds 0 unnamed buttons/links.
- Component/layout behaviour checks (62 checks: labels, dialogs, focus, Escape, stacking,
  star keyboard, pagination, layouts) ran in a simulated DOM. They are not in the repo
  because they need `jsdom`; ask if you want them added as a dev dependency.

## NOT tested
- No real browser, phone or screen reader (none available here). Please click through on a phone.
- No real Brevo call (the sandbox cannot reach api.brevo.com). Email delivery, spam placement
  and sender verification are the first things to check on staging.
