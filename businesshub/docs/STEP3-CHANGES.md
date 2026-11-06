# Step 3 — Discovery, follows, reviews, rankings

Everything here uses real database records. Empty sections show empty states; nothing is padded with samples.

## What's new

| Area | What it does | Where |
|------|--------------|-------|
| **Search & browse** | `/discover` page and `GET /api/discover/businesses`: search by business name, category, description, city/state **and products sold**; filter by category, city, delivery (only businesses that said "available"), verified, minimum rating; sort by best match, rating, most followed, newest, name; paginated (max 24/page). Filters live in the URL. | `services/discovery.js`, `controllers/discoverController.js`, `pages/public/Discover.jsx` |
| **Follow / unfollow** | One follow per account per business (unique index; repeating the request is harmless). The follower count is **recounted** from the follow records each time. You can't follow your own business. | `controllers/followController.js`, `FollowButton.jsx` |
| **Reviews** | 1–5 whole stars + optional text (max 1000). One per account per business; author can edit/delete; owners can't review themselves; confirmed email required (configurable). Public names are shortened ("Ada L."). No "verified purchase" claim anywhere. | `controllers/reviewController.js`, `StoreReviews.jsx` |
| **Ratings** | Each business's average/count is recalculated from its *published* reviews after every create/edit/delete/moderation. Clients can't set them. "No reviews yet" is shown instead of a rating when there are none. | `services/ratingService.js` |
| **Moderation** | Admin → Reviews: hide (reason required) or restore. Ratings update; every decision is written to the audit log. An author cannot un-hide their own moderated review. | `adminController.js`, `AdminReviews.jsx` |
| **Homepage** | Top rated, Popular (most followed), New. Sections with nothing to show disappear. | `HomeDiscovery.jsx` |
| **Storefront** | Rating summary, follower count, follow button, review list/form, verified badge (only ever shown for admin-verified businesses). Dashboard shows rating, followers and verification state. | `Store.jsx`, `MyBusiness.jsx` |
| **Privacy** | The public storefront endpoint now returns an explicit allow-list: no internal owner id, no bank details. | `STOREFRONT_FIELDS` |

## How ranking works (plain language)
1. Businesses with at least **3 reviews** (`RANKING_MIN_REVIEWS`) always rank above those with fewer; those with some reviews rank above those with none.
2. Within a group, a **Bayesian average** decides: a business's average is blended with the platform-wide average, weighted by how many reviews it has (`RANKING_PRIOR_WEIGHT`). One 5★ review therefore cannot beat an established business.
3. "Top rated" on the homepage only lists businesses at or above the minimum.

## "Top selling" is intentionally NOT shown
Orders and their paid/completed flags are entered by the sellers themselves; the only independently confirmed payments in the system are subscription payments. A public "top selling" ranking built on that could be inflated by a seller marking their own orders paid. The homepage section is therefore called **Popular** (most followed). A real top-selling list needs independently verified payments (for example Paystack checkout for orders), which is a separate piece of work.

## Deploy
1. Step 2 deploy and `npm run migrate:step2 -- --apply` must already be done (new fields are read by these queries).
2. Deploy server, then client. New indexes on `businesses` are created automatically at startup; with a small collection this takes moments.
3. Optional env: `REVIEWS_REQUIRE_VERIFIED_EMAIL`, `RANKING_MIN_REVIEWS`, `RANKING_PRIOR_WEIGHT` (see `server/.env.example`).

## Rollback
Redeploy the previous build. The new `reviews` and `follows` collections are simply unused by old code; no existing data was changed.

## Verified vs not verified
- Verified: **77/77 server tests pass.** The ranking, filtering, search-matching and pagination tests run the real aggregation pipeline against sample data using an in-memory MongoDB engine (`mingo`, dev dependency). Follow/review/moderation rules are tested with in-memory stand-ins. Client builds, and the new components render correctly with edge-case data (no reviews, missing fields, HTML in names).
- **Not verified:** nothing has run against a real MongoDB (index builds, real aggregation performance), a real browser, or a phone. Please click through: search, filters, follow, review, hide a review as admin.

## Known limitations / next
- Search uses case-insensitive pattern matching; fine for hundreds or low thousands of businesses. A text/search index is the upgrade path if the list grows large.
- Businesses whose owner account is deactivated stay listed unless an admin unpublishes them.
- Admin cannot yet set the verified badge; that is the verification workflow (next step).
- Reviews don't notify the business owner yet.
