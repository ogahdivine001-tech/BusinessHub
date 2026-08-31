# BusinessHub

**Everything Your Business Needs, In One Place.**

BusinessHub is a full-stack SaaS platform for small businesses, freelancers, vendors, and entrepreneurs. It gives every business a public online storefront, product and order management, invoicing/receipts, a customer CRM, an AI marketing assistant, analytics, and a subscription system — all from one dashboard.

This is a real, runnable application (not a static demo): a React/Vite frontend talking to an Express/MongoDB REST API with JWT auth, protected routes, and validation throughout.

---

## Table of contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Folder structure](#folder-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [MongoDB setup](#mongodb-setup)
- [Cloudinary setup (optional)](#cloudinary-setup-optional)
- [AI setup (optional)](#ai-setup-optional)
- [Paystack setup (optional)](#paystack-setup-optional)
- [Seeding demo data](#seeding-demo-data)
- [Development commands](#development-commands)
- [Production deployment](#production-deployment)
- [Security notes](#security-notes)
- [What's stubbed vs. fully wired](#whats-stubbed-vs-fully-wired)

---

## Features

- **Public business pages** — every business gets a shareable storefront at `/store/:slug`
- **Product management** — images (Cloudinary), pricing, discounts, stock, categories
- **Orders** — status pipeline (pending → processing → completed/cancelled), payment status
- **Customers** — CRM with purchase history and lifetime spend
- **Invoices & receipts** — generate, mark paid/unpaid, download branded PDFs
- **AI Business Assistant & Marketing tools** — product descriptions, social captions, ad copy, business bios, marketing ideas
- **Analytics** — revenue, orders, best sellers, sales by category, with 7d/30d/90d/1y ranges
- **WhatsApp click-to-chat** — no API key needed, uses `wa.me` deep links
- **Subscriptions** — Free / Starter / Pro plans with enforced usage limits, Paystack checkout scaffolding
- **Admin dashboard** — platform-wide stats, user/business management, role-based access
- **Light & dark mode**, responsive from mobile to desktop, toasts, skeleton loaders, empty states, confirm dialogs

## Technology stack

**Frontend:** React, Vite, JavaScript, Tailwind CSS, React Router, Axios, Framer Motion, Lucide React, Recharts

**Backend:** Node.js, Express, MongoDB + Mongoose, JWT (httpOnly cookie), bcryptjs, express-validator, Helmet, CORS, express-rate-limit

**Integrations (service-layer ready, activate with your own keys):** Cloudinary (images), OpenAI-compatible API (AI features), Paystack (payments)

## Folder structure

```
businesshub/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # Reusable UI (Button styles, Modal, Table, Toast, etc.)
│       ├── pages/          # Route-level pages (auth/, dashboard/, admin/, public/, legal/)
│       ├── layouts/        # PublicLayout, DashboardLayout, AdminLayout
│       ├── context/        # AuthContext, ThemeContext
│       ├── services/       # One file per API resource (axios calls)
│       └── routes/         # ProtectedRoute, AdminRoute guards
├── server/                 # Express API
│   ├── config/             # db.js, cloudinary.js
│   ├── controllers/        # Business logic per resource
│   ├── routes/             # Express routers per resource
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # auth, error handling, rate limiting
│   ├── services/           # aiService, uploadService, pdfService, paystackService, whatsappService
│   ├── validators/         # express-validator rule sets
│   └── seed/                # Demo data seed script
├── README.md
├── .gitignore
```

## Getting started

**Prerequisites:** Node.js 18+, npm, a MongoDB connection string (local or [MongoDB Atlas](https://www.mongodb.com/atlas)).

```bash
# 1. Clone/unzip the project, then from the businesshub/ folder:

# Backend
cd server
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET at minimum
npm install
npm run dev                # starts on http://localhost:5000

# Frontend (in a new terminal)
cd client
cp .env.example .env       # defaults to http://localhost:5000/api
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173`. Register a new account, complete onboarding, and you're in the dashboard. Or seed demo data first (see below) and log in with the demo account.

## Environment variables

Backend (`server/.env`, see `server/.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string for signing auth tokens |
| `CLIENT_URL` | Yes | Frontend origin, for CORS (`http://localhost:5173` in dev) |
| `PORT` | No | API port (default `5000`) |
| `CLOUDINARY_*` | No | Enables logo/product image uploads |
| `OPENAI_API_KEY` | No | Enables AI Assistant & Marketing tools |
| `PAYSTACK_*` | No | Enables subscription checkout |

Frontend (`client/.env`, see `client/.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:5000/api` |

**Never commit a real `.env` file.** Only `.env.example` files with placeholders are included in this repo.

## MongoDB setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow your IP (or `0.0.0.0/0` for development).
3. Copy the connection string into `server/.env` as `MONGO_URI`, e.g.:
   ```
   MONGO_URI=mongodb+srv://user:password@cluster0.mongodb.net/businesshub
   ```
4. Collections and indexes are created automatically by Mongoose on first run.

## Cloudinary setup (optional)

Without Cloudinary credentials, image upload endpoints return a clear "not configured" error instead of failing silently — everything else works normally with placeholder icons in place of images.

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Copy your Cloud Name, API Key, and API Secret from the dashboard into `server/.env`.

## AI setup (optional)

The AI Assistant and Marketing tools call an OpenAI-compatible chat completions endpoint from the backend only — the key never reaches the browser.

1. Get an API key from [platform.openai.com](https://platform.openai.com) (or any OpenAI-compatible provider).
2. Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`) in `server/.env`.
3. Without a key set, AI endpoints return a friendly "not configured yet" message instead of erroring.

## Paystack setup (optional)

1. Get your test keys from [paystack.com](https://paystack.com).
2. Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` in `server/.env`.
3. The Settings → Subscription tab will initialize real Paystack transactions once configured.

## Seeding demo data

```bash
cd server
npm run seed
```

Creates a demo user (`demo@businesshub.app` / `Demo1234!`), a sample business ("Divine Fashion"), products, customers, orders, and one invoice — useful for exploring the dashboard immediately.

## Development commands

```bash
# Backend
cd server
npm run dev     # nodemon, auto-restart
npm start        # production start
npm run seed      # populate demo data

# Frontend
cd client
npm run dev       # Vite dev server
npm run build      # production build to client/dist
npm run preview     # preview the production build locally
```

## Production deployment

- **Frontend → Vercel:** import the `client/` folder as the project root, set `VITE_API_URL` to your deployed API URL as an environment variable, build command `npm run build`, output directory `dist`.
- **Backend → Render or Railway:** import the `server/` folder, set the environment variables from `server/.env.example` with real values, start command `npm start`.
- **Database → MongoDB Atlas:** point `MONGO_URI` at your Atlas cluster; make sure the backend host's IP (or `0.0.0.0/0`) is allow-listed.
- Set `CLIENT_URL` on the backend to your deployed frontend origin so CORS and cookies work correctly.
- Set cookies to `secure: true` automatically kicks in when `NODE_ENV=production` (already handled in `utils/generateToken.js`).

## Security notes

- Passwords are hashed with bcrypt (12 rounds), never returned in API responses.
- Auth uses a JWT stored in an **httpOnly** cookie — never in `localStorage`, so it isn't accessible to XSS.
- All business-scoped routes (`/api/products`, `/api/orders`, etc.) verify the resource belongs to the logged-in user's business — no cross-tenant access.
- Admin routes require `role: 'admin'` and are separate from business-owner routes entirely.
- Rate limiting is applied globally, more strictly on `/api/auth/*` and `/api/ai/*`.
- Helmet, CORS allow-listing, and `express-mongo-sanitize` are enabled by default.
- Secrets (`JWT_SECRET`, `MONGO_URI`, Cloudinary/OpenAI/Paystack keys) are read from environment variables only and are never sent to the frontend.

## What's stubbed vs. fully wired

Everything in this project is real, working code — there is no fake/mocked functionality. The one thing this environment cannot do is create third-party accounts on your behalf. So:

- **Fully wired and testable today, no external accounts needed:** auth, onboarding, business profiles, products, categories, customers, orders, invoices, receipts (with real PDF generation), analytics, WhatsApp links, admin dashboard.
- **Wired, but needs your own API key to activate:** image uploads (Cloudinary), AI Assistant & Marketing tools (OpenAI), subscription checkout (Paystack). Each has a clean service layer behind an env-var check — add the key and it works with no code changes.

---

Built with BusinessHub's own design system: one primary brand color (`brand-600`, indigo), neutral grays, rounded-2xl cards, and consistent spacing throughout.
