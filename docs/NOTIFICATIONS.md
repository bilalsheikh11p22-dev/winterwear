# WinterWear — Notifications, Coupons & Campaigns

MongoDB is the source of truth. Socket.IO is only a fast delivery path; if a socket drops, everything is still
available through the REST API.

## 1. Install & run

```bash
# server
cd server && npm install
cp .env.example .env          # fill in MONGODB_URI, JWT secrets, Cloudinary, etc.
npm run db:indexes            # REQUIRED once (and after upgrades): builds unique/TTL/partial indexes + back-fills data
npm run dev                   # API + Socket.IO + background worker (WORKER_ENABLED=true)

# client
cd client && npm install
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:5000/api/v1  (socket origin is derived from it)
npm run dev
```

`autoIndex` is off in production, so **`npm run db:indexes` must be run on deploy**. It is idempotent, never deletes
documents, and back-fills `Notification.category` and `Product.publishedAt` for pre-existing rows.

### Separate worker process (recommended when running >1 API instance)
```bash
WORKER_ENABLED=false npm start   # API instances
npm run worker                   # one (or more) worker processes — safe to run several; all state is in MongoDB
```

## 2. Environment variables (new)

| Variable | Default | Purpose |
|---|---|---|
| `SOCKET_CORS_ORIGIN` | – | Extra allowed socket origins (comma separated). `CLIENT_URL` is always allowed |
| `API_PUBLIC_URL` | `http://localhost:$PORT` | Builds the unsubscribe link in promotional emails |
| `SMTP_HOST/PORT/SECURE/USER/PASSWORD`, `EMAIL_FROM` | – | Email. `SMTP_PASS`/`SMTP_FROM` are accepted as aliases |
| `WORKER_ENABLED` | `true` | Run the worker inside the API process |
| `WORKER_INTERVAL_MS` | `5000` | Worker poll interval |
| `OUTBOX_INLINE` | `true` | Also process events ~25 ms after queuing (latency); the worker is the safety net |
| `MARKETING_MAX_PER_DAY` | `3` | Promotional in-app notifications per customer per 24 h |
| `CAMPAIGN_BATCH_SIZE` | `200` | Campaign fan-out batch size |
| `FULFILLMENT_SLA_HOURS` | `24` | Alert staff when confirmed/processing orders sit longer |
| `REDIS_URL` | – | Optional. Needed only for multiple API instances (see §6) |

Never put SMTP/API secrets in the client. Only `VITE_*` values reach the browser.

## 3. Event flow

```
business code ──(after its own DB write succeeds)──► publishXxx()  ──► OutboxEvent (unique eventId)
                                                                           │ worker / inline drain
                                                                           ▼
                                                          handler ──► createNotification()
                                                                           │ 1. preferences + frequency cap
                                                                           │ 2. INSERT (unique recipient+eventId  ⇒ idempotent)
                                                                           │ 3. Socket.IO emit (best effort)
                                                                           └ 4. queue "notification.email" (own retries)
```

* **Idempotency** — every event has a deterministic id (`order.placed:<orderId>`, `order.status:<orderId>:<historyId>`,
  `payment.confirmed:<orderId>`, `campaign:<id>` …). Duplicate webhooks / retries / worker restarts collapse to one row.
* **Durability** — the outbox row is written before processing; failures retry with exponential backoff (30 s → 1 h cap,
  6 attempts) then become `dead` (visible & retryable in *Admin → Notifications → Deliveries & queue*).
* **Safety net** — the worker re-queues any order created in the last 2 h whose `order.placed` event is missing.
* **Email failure never removes the in-app notification.** Email is a separate job with its own attempts
  (`NotificationDeliveryAttempt`).
* **Payment truth** — "payment confirmed" is only published by the verified payment webhook, and the handler re-checks
  `order.paymentStatus === 'paid'` in MongoDB before announcing.

### Events wired to real business actions
Orders (placed / payment pending / payment confirmed / failed / every status change incl. shipped, rider assigned,
out for delivery, delivered, delivery failed, cancelled, return requested, refunded), refunds & return reviews,
coupon applied / rejected, product published, back-in-stock, price drop, low / out of stock, stock received,
rider assignment, COD reconciliation, delayed fulfilment, coupon expiry reminders, registration, password
change / reset, new-network login, profile update, rider application/approval.

## 4. Coupons

Create in **Admin → Coupons** (or `POST /api/v1/admin/coupons`). Supports percentage / fixed / free shipping, minimum
order, max-discount cap, start/expiry, global limit, per-customer limit, eligible products & categories, sale-item
exclusion, first-order-only, segments (all / new / returning), visibility (public list vs. hidden code).

Lifecycle (no coupon is consumed by a *preview*):

| Step | State |
|---|---|
| `POST /coupons/validate` | preview only; server prices the cart itself |
| checkout creates order | **reserved** (atomic: global capacity + per-customer slot) |
| COD order placed / online payment verified by webhook | **redeemed** |
| order cancelled / failed / payment window expires | **released** (capacity and customer slot freed) |

Concurrency safety comes from a single-document atomic `$inc` guarded by `currentUsageCount + reservedCount < max`,
plus a partial-unique index on `(coupon, user, slot)`.

Development sample codes (create them yourself; nothing is seeded in production): `WINTER10`, `WELCOME15`, `COLDSEASON20`.

To announce a coupon: *Admin → Notifications → Campaigns → New campaign → Discount code* → preview → publish.
Text (code, discount, minimum, expiry) is generated from the coupon record.

## 5. Campaigns
Product announcement, discount code, custom. Audiences: all customers, previous buyers, new customers, wishlisters of a
product. Always filtered by customer preferences, the 24 h promotional cap, and marketing-email opt-in (emails).
Schedule, pause, cancel; fan-out is cursor-based and resumable. Publishing a **product** automatically creates a
one-off announcement campaign (never for drafts; never twice for the same product).

Metrics shown are only what is measurable: created, in-app read, in-app click, email sent/failed/skipped, coupon
redemptions & attributed sales. **Delivered / bounced / opened / email-clicked are intentionally `null`** until a
provider webhook is connected.

## 6. Socket.IO
Authenticated with the access token at handshake; user re-loaded from MongoDB (deactivated users refused); rooms are
assigned server-side (`user:<id>`, and `role:<role>` for staff) — clients cannot join rooms. Connections are dropped at
token expiry; the client refreshes the token and reconnects, then refetches state from the API.

One process only by default. For several API instances install `@socket.io/redis-adapter redis` and set `REDIS_URL`
(the code path exists but is **not covered by tests**).

## 7. Email providers
`services/notifications/emailProvider.js` exposes `getEmailProvider()`. SMTP (nodemailer) is implemented. Add another
provider (SES, SendGrid, …) by returning an object with `name` and `send({to,subject,html,text,headers})`.
Without credentials emails are recorded as `skipped / email_not_configured`.

## 8. Tests
```bash
cd server && npm test        # 136 tests (needs a local MongoDB; see below)
cd client && npm test        # 46 tests (Vitest + Testing Library)
```
Server tests use a **local** MongoDB and one database per file (`winterwear_test_<suite>`); the harness refuses any other
target. Any MongoDB 6/7 works; for transactions-free tests a standalone instance is enough
(`TEST_MONGODB_BASE=mongodb://127.0.0.1:27017`).

## 9. Troubleshooting
| Symptom | Check |
|---|---|
| Bell never updates live | Browser console for socket `connect_error`; `SOCKET_CORS_ORIGIN`; reverse proxy must allow WebSocket upgrade on `/socket.io`. The UI falls back to 60 s polling |
| No emails | *Admin → Notifications → Overview* shows provider status; check `SMTP_*`; failed attempts appear under Deliveries |
| Duplicate-key errors at startup | Run `npm run db:indexes` |
| Announcements not created for a new product | Product must be `isPublished: true`; the worker must be running (or `OUTBOX_INLINE=true`) |
| `E11000` on coupons | Code already exists (codes are unique, case-insensitive) |
