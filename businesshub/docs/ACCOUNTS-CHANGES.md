# Seller and customer accounts

## What was missing
Phase 3 of the brief asked for two account types with their own dashboards. In Step 2 I added the customer role on the server but left sign-up and the customer area for later, and then did not come back to it. Until this update there was no way to sign up as a customer, no customer area, and login/landing sent everyone to the seller dashboard.

## What now exists
| Area | What changed |
|---|---|
| **Sign-up** | The sign-up page asks "I want to sell" or "I'm a customer". `/register?type=buyer` opens the customer form directly. Customers skip business setup entirely. |
| **Customer area** (`/account`) | Overview, **Following** (with unfollow), **My reviews** (including ones a moderator hid; delete or edit-on-page), **Notifications**, **Settings** (profile, email confirmation, password). Built for phones first. |
| **Routing** | One rule (`homeFor`) decides where people land after login, sign-up and on the landing page: customers go to `/account`, sellers to the dashboard (or business setup if unfinished). A customer who opens a seller URL (dashboard, onboarding) is sent to `/account`. Logged-in people no longer see "Login" in the public header; they see "My account" or "Dashboard". |
| **Become a seller** | A customer can turn their account into a seller account from the overview (one-way, with a confirmation). Follows and reviews are kept. Sellers are unaffected; admin accounts can never be changed this way. |
| **Sellers as customers** | Sellers can already follow and review other businesses. They now have **Following & reviews** in their dashboard menu. |
| **Storefront** | Logged-out visitors see "Follow" and "create a free customer account" prompts instead of a dead-end login. |
| **Admin** | Users page has a role filter (Sellers / Customers / Admins) and shows "Seller / Customer". Overview shows counts of sellers and customers. |
| **Admin messages** | **Found and fixed:** bulk messages were hard-wired to business owners only, so customers could never receive one. New audiences: *All customers* and *Everyone*. *All* keeps meaning all sellers (its label now says so), and existing audiences are unchanged. Safeguards (confirmation, 1,000-person cap, audit log) apply. |
| **Help** | Getting-started, reviews and FAQ articles describe both account types. |

## Existing accounts
Every existing account is a seller and is untouched. No migration is needed.

## What customers cannot do yet (so you aren't surprised)
- **Order history.** Orders placed on a storefront are not linked to a customer account (they are captured by name and phone), so there is nothing truthful to list. Showing an empty "Orders" page would imply a feature that does not exist. The overview explains how ordering works instead. Linking logged-in customers' orders to their account is possible but is a separate piece of work.
- **Saved products / wishlist.** Not built.
- **AI assistant.** Customers use the public Help Center; the AI assistant is part of seller plans.

## Settings
`ENABLE_BUYER_SIGNUP` is now **on by default**. Set it to `false` to close customer sign-up (sellers are unaffected).

## Deploy and rollback
No database changes. Deploy server, then client. To roll back, redeploy the previous build; accounts created in the meantime keep working as customer accounts on old code only in the sense that they exist, so close sign-up first (`ENABLE_BUYER_SIGNUP=false`) if you roll back.

## Try it
1. Sign up as a customer (`/register?type=buyer`): you land on `/account`. Try to open `/dashboard` and `/onboarding`: you are sent back to `/account`.
2. Follow a business and leave a review (confirm the email first); see both under Following and My reviews.
3. Use "Start selling on BusinessHub": you go to business setup, then the seller dashboard.
4. As admin: filter Users by Customers; send a test message to one customer using "One person (by email)" before using "All customers".

## Verified vs not verified
- **Verified:** 170/170 server tests. New tests cover: sign-up open by default / closable / never able to create an admin; the one-way, admin-proof role switch; "my reviews" returning only the caller's reviews and no private fields; admin role filter; a check that **every seller-only route file requires a business account** (so a customer cannot reach seller tools); and who receives each admin message audience. The routing decisions were run through the real guard components for five kinds of visitor (anonymous, customer, seller, seller mid-setup, admin), and all pages render.
- **Not verified:** nothing was run in a real browser or on a phone, or against a real database or email provider. Please click through the four steps above.
