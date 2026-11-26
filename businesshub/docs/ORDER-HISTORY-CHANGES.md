# Customer order history ("My orders")

Applies on top of the accessibility + Brevo release (merge that first).
No migration. No new npm dependencies.

## What customers get
- **My orders** (`/account/orders`): every order they placed from a storefront **while logged in**,
  newest first, 10 per page, with the business, items, total, date and the status the seller set.
  Overview has a new "Your orders" tile with the count. Works for customers and for sellers who
  buy from other businesses (dashboard menu: "Orders, following & reviews").
- **Storefront order form**: logged-in people get name and phone pre-filled (editable); the success
  message says when the order was saved to My orders. Logged-out visitors see a short hint that
  they can log in or create a free customer account first, and can still order without one.

## How it works
- `Order.buyer` (new, optional, indexed) holds the account id. It is set only from the
  authenticated login, never from anything in the request body.
- `POST /api/businesses/store/:slug/orders` now runs `optionalAuth` (rate limit first): a valid
  login is recognised, and a missing/expired/invalid token simply means "anonymous", so a stale
  login can never stop someone placing an order.
- A business owner ordering from their own storefront is not recorded as a customer order.
- `GET /api/my-orders` (`routes/myOrderRoutes.js`) is open to any logged-in person and always
  filters by their own account id. A `buyer`/`user` query parameter is ignored.
- The response is a whitelist: no seller notes, no seller customer record, no owner id, no bank
  details, no image ids. Unpublished storefronts show the name without a link; deleted businesses
  are handled.

## Honest limits (please read)
- **Past orders are not linked.** Orders placed before this release, or while logged out, have only a
  name and phone number. Guessing which account they belong to would be wrong and a privacy risk,
  so they are not added. The page says so.
- A seller can delete an order from their dashboard; it then disappears from the customer's list too.
- BusinessHub still takes no payment for these orders. "Payment recorded by the seller" means exactly
  that: the seller marked it. The statuses are whatever the seller sets.
- No cancel / reorder / tracking buttons yet.

## Deploy
Deploy server, then client. The new index on `orders.buyer` is created automatically by Mongoose on
server start (the collection is small; on a large collection Atlas builds it in the background).

## Tests
- Server: **197 / 197** (181 existing + 16 new in `tests/myorders.test.js`): optional auth never blocks
  (junk/expired/wrong-secret/deleted/disabled tokens), buyer linking (logged in, anonymous, owner,
  seller-as-buyer, forged body field), the real order rules still hold, list isolation between
  accounts, no private-data leak, paging edge cases, route wiring.
- `tests/step7.test.js`: `myOrderRoutes.js` added to the deliberate "open to any logged-in person" list.
- Help Center: `npm run kb:check` passes; FAQ and reviews/followers articles updated.
- Client: builds; linter clean; 17 new page checks (loading, wording, links, escaping of hostile text,
  empty, error + retry, paging) in a simulated browser, plus the earlier 62.

## NOT tested
- No real MongoDB, browser, phone or screen reader. Please place one order while logged in on a phone
  and check it appears in My orders, then place one logged out and check it does not.
