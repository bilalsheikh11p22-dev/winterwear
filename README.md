# WINTERWEAR — Full-Stack Premium Winter Fashion Platform

**WinterWear** is an architectural, production-ready winter outerwear e-commerce platform and management ecosystem. It merges the aesthetic refinement of European haute couture with sub-zero alpine technical engineering.

---

## 1. System Architecture & Tech Stack

```
                          ┌───────────────────────────┐
                          │   WinterWear Client       │
                          │   React + Vite + Tailwind │
                          │   GSAP + Lenis Smooth-Scroll│
                          └─────────────┬─────────────┘
                                        │ REST / JSON
                                        ▼
                          ┌───────────────────────────┐
                          │   WinterWear Express API   │
                          │   JWT Auth & RBAC Guard   │
                          │   Order State Machine     │
                          └──────┬─────────────┬──────┘
                                 │             │
                ┌────────────────┴─┐         ┌─┴────────────────┐
                │  MongoDB Atlas   │         │ Cloudinary Media │
                │  Mongoose Models │         │ Signed Uploads   │
                └──────────────────┘         └──────────────────┘
```

### Frontend
- **React.js 19 (Vite 8)** with modern ESM architecture and code-split vendor bundles
- **Tailwind CSS** with brand palette tokens (`charcoal`, `cream`, `burgundy`, `ice`, `silver`)
- **Lenis Smooth Scrolling** synchronized with the GSAP ticker
- **GSAP & ScrollTrigger** for cinematic hero reveals and scroll-driven storytelling
- **Framer Motion** for micro-interactions and modal transitions
- **Lucide React** for minimal iconography
- **Context API** for persistent Cart, Wishlist & Auth state

### Backend
- **Node.js ≥20 & Express.js 4**
- **MongoDB Atlas & Mongoose 8** with compound indexing and schema validations
- **JWT (JSON Web Tokens)** with HTTP-Only cookie refresh tokens and RBAC authorization
- **Cloudinary** media pipeline for signed uploads and responsive transformations
- **Stripe** (primary payment provider) with webhook signature verification and idempotency
- **Safepay** (Pakistan alternative) with HMAC-SHA256 webhook verification
- **Cash on Delivery** support with rider POD reconciliation
- **Centralized Error Handling** with structured JSON payloads

---

## 2. Brand Identity & Visual Palette

| Token | Hex | Role |
| :--- | :--- | :--- |
| **Midnight Charcoal** | `#17191C` | Primary foundation & immersive dark backgrounds |
| **Snow White** | `#F8F7F4` | Primary high-contrast text and crisp accents |
| **Warm Cream** | `#EDE7DC` | Secondary foundation, badges, buttons & borders |
| **Burgundy** | `#762B3D` | Primary actions, sale highlights & bag alerts |
| **Ice Blue** | `#C9DDE8` | Alpine highlights, capsule badges & technical tags |
| **Silver Grey** | `#A9ADB3` | Secondary text, borders, specifications & captions |

---

## 3. Order Lifecycle State Machine

```
Cart
  └─► Checkout
        └─► pending_payment (stock reserved for 30 min)
              ├─► confirmed (payment verified / COD confirmed)
              │     └─► processing → packing → ready_for_dispatch
              │           └─► assigned_to_rider → picked_up
              │                 └─► out_for_delivery
              │                       ├─► delivered (OTP/signature POD)
              │                       └─► delivery_failed → rescheduled
              └─► cancelled (timeout / user / admin)
                        └─► refunded (if payment captured)
```

---

## 4. Role-Based Access Control

| Role | Key Access |
| :--- | :--- |
| `super_admin` | Full platform control, staff management, audit logs |
| `admin` | Products, orders, coupons, banners, campaigns |
| `inventory_manager` | Inventory, stock movements, warehouses, purchase orders |
| `warehouse_staff` | Stock receiving, picking/packing |
| `fulfillment_staff` | Order fulfillment, shipment creation |
| `rider` | Assigned deliveries only, POD submission |
| `customer_support` | View orders, moderate reviews |
| `finance_staff` | Finance reports, refunds, COD reconciliation |
| `marketing_manager` | Banners, campaigns, coupons |
| `customer` | Shopping, cart, wishlist, orders |

---

> **Notifications, coupons & campaigns:** see [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md) — run `npm run db:indexes` in `server/` on every deploy.

## 5. Development Quickstart

### Prerequisites
- Node.js `v20+`
- npm `v10+`
- MongoDB Atlas cluster (or local MongoDB 7+)

### 1. Clone & install
```bash
git clone https://github.com/your-org/winterwear.git
cd winterwear
```

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env and fill in all required values
npm run dev
```
Server runs on: `http://localhost:5000`

### 3. Frontend setup
```bash
cd client
npm install
cp .env.example .env
# Edit .env — set VITE_API_BASE_URL=http://localhost:5000/api/v1
npm run dev
```
Storefront runs on: `http://localhost:5173`

### 4. Seed development data
```bash
cd server
npm run seed
```
Seeds categories, products, and test accounts:
- `admin@winterwear.local` / `Admin123!`
- `warehouse@winterwear.local` / `Warehouse123!`
- `rider@winterwear.local` / `Rider123!`

---

## 6. Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
| :--- | :---: | :--- |
| `NODE_ENV` | ✅ | `development` \| `production` \| `test` |
| `PORT` | — | Default: `5000` |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars, unique — **never use defaults** |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, unique — **never use defaults** |
| `ACCESS_TOKEN_TTL` | — | Default: `15m` |
| `REFRESH_TOKEN_TTL` | — | Default: `7d` |
| `CORS_ORIGIN` | ✅ prod | Frontend origin, e.g. `https://winterwear.pk` |
| `CLIENT_URL` | ✅ prod | Same as `CORS_ORIGIN` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | From Cloudinary dashboard |
| `STRIPE_SECRET_KEY` | ✅ | `sk_test_...` (test) or `sk_live_...` (prod) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From Stripe Dashboard → Webhooks |
| `PAYMENT_SUCCESS_URL` | ✅ | e.g. `https://winterwear.pk/checkout/success` |
| `PAYMENT_CANCEL_URL` | ✅ | e.g. `https://winterwear.pk/checkout/cancelled` |
| `SAFEPAY_API_KEY` | — | From Safepay Dashboard (Pakistan alternative) |
| `SAFEPAY_SECRET_KEY` | — | From Safepay Dashboard |
| `SAFEPAY_WEBHOOK_SECRET` | — | From Safepay Dashboard |
| `ENABLE_CASH_ON_DELIVERY` | — | `true` \| `false` (default: `true`) |
| `DEFAULT_CURRENCY` | — | Default: `PKR` |
| `FREE_SHIPPING_THRESHOLD_PKR` | — | Default: `5000` |
| `FLAT_SHIPPING_FEE_PKR` | — | Default: `250` |
| `RESERVATION_EXPIRY_MINUTES` | — | Default: `30` |
| `SMTP_HOST` | — | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | — | Default: `587` |
| `SMTP_USER` | — | SMTP login username |
| `SMTP_PASSWORD` | — | SMTP login password |
| `EMAIL_FROM` | — | e.g. `WinterWear <noreply@winterwear.pk>` |

### Frontend (`client/.env`)

| Variable | Description |
| :--- | :--- |
| `VITE_API_BASE_URL` | Backend URL, e.g. `https://api.winterwear.pk/api/v1` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Public — safe to expose |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` or `pk_live_...` — safe to expose |
| `VITE_CURRENCY` | `PKR` |
| `VITE_FREE_SHIPPING_THRESHOLD` | `5000` |
| `VITE_FLAT_SHIPPING_FEE` | `250` |
| `VITE_ENABLE_COD` | `true` |

---

## 7. Testing

```bash
cd server
npm test
```

All 59 tests must pass before any deployment. Tests cover:
- Authentication & RBAC (roles, token refresh, unauthorized access)
- Order & Checkout validation
- Checkout state machine (cancellation, auth guards)
- Cloudinary media operations
- Phase 7 AI assistant & grounded tools
- Admin & Phase 6 operational routes

---

## 8. Production Deployment

### Backend → Render.com

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set **Root directory**: `server`
4. Set **Build command**: `npm ci`
5. Set **Start command**: `node src/server.js`
6. Set **Health check path**: `/api/ready`
7. Add all environment variables from the table above via **Environment → Add environment variable**
8. Set `NODE_ENV=production`

> **Alternatively**, push `render.yaml` to your repository root and use Render's Blueprint deployment.

### Frontend → Vercel

1. Import your repository on [vercel.com](https://vercel.com)
2. Set **Framework**: `Vite`
3. Set **Root directory**: `client`
4. Set **Build command**: `npm run build`
5. Set **Output directory**: `dist`
6. Add all `VITE_*` environment variables via the Vercel dashboard
7. Vercel will automatically use `client/vercel.json` for SPA routing

### Stripe Webhook Setup

1. In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add endpoint:
   - **URL**: `https://api.winterwear.pk/api/v1/webhooks/stripe`
   - **Events**: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
2. Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`

### MongoDB Atlas Setup

1. Whitelist your Render service's **Outbound IP** (or use `0.0.0.0/0` with strong auth)
2. Create a dedicated database user with `readWrite` on the `winterwear` database
3. Enable **Atlas Performance Advisor** for index recommendations
4. Set up **Atlas Backup** (daily snapshots recommended)

---

## 9. CI/CD Pipeline

The `.github/workflows/ci.yml` pipeline runs on every push to `main`/`develop` and all PRs:

1. **Backend job**: `npm ci → npm test` (all 59 tests must pass)
2. **Frontend job**: `npm ci → oxlint → vite build` (must produce a clean dist)

PRs to `main` are blocked if either job fails.

---

## 10. Rollback Procedure

### Backend (Render)
1. In Render dashboard → **Deploys** → find last successful deploy
2. Click **Rollback to this deploy**
3. Render rolls back in ~30 seconds with zero downtime

### Frontend (Vercel)
1. In Vercel dashboard → **Deployments** → find last successful deploy
2. Click the **⋯** menu → **Promote to Production**
3. Vercel instantly routes production traffic to the older build

### Database
- Use MongoDB Atlas point-in-time restore to a snapshot before the bad deploy
- Coordinate with backend rollback to ensure schema compatibility

---

## 11. Security Notes

- All JWT secrets must be **≥32 unique random characters** — never the development defaults
- The API enforces hardcoded-default detection and will `process.exit(1)` in production if defaults are detected
- Stripe webhook signatures are verified with `stripe.webhooks.constructEvent` before any processing
- Safepay webhooks are verified with HMAC-SHA256 before processing
- Payment idempotency is enforced: duplicate webhook events are ignored
- Access tokens are stored in `localStorage` (`ww_access_token`) — document this XSS risk in your security policy
- Refresh tokens are stored in `httpOnly` cookies and are rotation-safe
- Rate limiting: auth endpoints (20/15 min), API (120/min), checkout (10/5 min)
- All admin/staff endpoints enforce role-based authorization server-side

---

## 12. API Documentation

Start the backend and visit: `http://localhost:5000/api/docs`

Swagger UI lists all available endpoints, authentication requirements, request/response schemas, and role requirements.

---

*WinterWear — Engineered for Sub-Zero Performance. Built for Alpine Luxury.*
