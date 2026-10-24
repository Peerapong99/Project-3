
# HomeMatch Premium Membership

Implemented in existing MVC backend and React/Vite web. Full source files are in the paths below; no code snippets need to be merged manually.

## Start

Backend: npm run dev from homematch-backend.
Web: npm run dev from homematch-web.

Local MongoDB was converted to the single-node replica set homematch-rs, bound to 127.0.0.1:27017. Existing homematch database is preserved.
The backend .env now includes replicaSet=homematch-rs in MONGO_URI. Do not commit .env.
Offline data and original MongoDB config/Backend env are backed up in C:/Project 3/backups/mongodb-20261014-103450.
This single-node deployment supports transactions for local development; it does not provide multi-node redundancy.
Conversion script: scripts/Enable-HomeMatchReplicaSet.ps1. It refuses to rerun when replication is already configured.

Plans seed automatically at server startup. npm run seed:subscriptions is also available; it preserves existing prices/limits.
Unique subscription/payment indexes are awaited before serving requests.
Real payment is DISABLED by default. No receiving account or payment QR is fabricated.

## Web pages

- /seller/subscription/plans: Free/Premium/Pro cards, server prices and benefits.
- /seller/subscription: current plan, start/end time, quota, progress, history and entitled analytics.
- /seller/subscription/checkout/:paymentId: server order, admin payment information, slip and review status (refresh every 15 seconds).
- /admin/subscriptions: payments, members/history, revenue, plan editing and payment settings.

Seller sidebar has แพ็กเกจสมาชิก and สมาชิกของฉัน. Admin sidebar has จัดการสมาชิก.
AddProperty reads current usage and disables creation if unavailable/full; the backend rechecks atomically.
EditProperty uses the current image limit. Existing images are retained after expiry.

## Payment setup

Login as Admin, open /admin/subscriptions, choose ตั้งค่ารับเงิน.

For testing, select จำลอง — ไม่รับเงินจริง and enable purchasing. Seller sees a simulation banner and uploads a test image. Admin approval activates the test membership. Simulation amounts never contribute to real revenue. Orders retain their mode even if settings later change.

For real manual payments, select รับเงินจริง, enter your actual receiving bank/account details OR upload the actual QR image from your bank (JPG/PNG/WEBP, <=500KB). Enable purchasing only after verifying recipient information. This app does not verify transfers with a bank and does not auto-charge or auto-renew. Admin must verify funds before approving. PromptPay ID is displayed if provided; the app does not generate a QR from it.

Each order snapshots payment instructions. Changing settings only affects new orders.
Slips are <=5MB, checked for image signatures, stored in private/subscription-slips outside public /uploads, and accessible only by the owner/Admin through an authenticated endpoint. Do not copy this directory into public hosting.

## Rules

Free = 0 THB, no expiry, 3 listings, 5 images.
Premium = 299 THB / 30 days, 20 listings, 15 images, viewing reports.
Pro = 599 THB / 30 days, 100 listings, 30 images, featured placement and daily reports.

Every seller without a paid entitlement receives Free. A subscription document is initialized lazily on use; Login/JWT and User remain unchanged.
Only pending and approved listings count. Rejected/sold/deleted listings do not count.
Creating a listing and resubmitting rejected -> pending require available quota.
Updates, deletions, sold transitions, reviews and approvals all serialize through the same seller subscription document in MongoDB transactions. The shared revision write forces concurrent creates to conflict/retry before checking the real count.
Failed transactions do not reserve slots or activate membership. Middleware checks alone are not the authoritative quota guard.

Image count includes property images + room images; floor plan images are separate (max 5 floors). Maximum configurable property image limit is 30. Upload batches and the final merged listing are both checked. Existing images over the expired quota can stay or be removed; they cannot be replaced/added above the new quota.

Submitting evidence NEVER activates a plan. Only Admin approval of a pending payment activates it.
A repeated/parallel approval returns 409 and cannot extend days twice. A reject racing an approve updates the same payment document; only one final decision wins.
Orders await evidence for 24 hours. After submission, pending evidence may be reviewed later.
Denied/expired orders require a new order. The prior record remains in history.

New or expired membership: starts at approval time for the purchased duration.
Same-plan renewal while active: adds the duration to the previous end time.
Premium -> Pro while active: Pro starts at approval for its full purchased duration; no prorating/credit in this version.
Pro -> Premium while active: denied; wait for expiry.
Plan changes affect new purchases; active/pending orders keep their price and entitlement snapshot. Free limits use the current admin-configured Free plan.

Expiry is enforced on EVERY entitlement read regardless of a scheduler. Listings and images are not deleted. Usage may exceed Free, remaining is 0, creating is blocked. The expiry event is persisted once at the next serialized operation/history request.

Feature placement is calculated by the backend from a live subscription, not a seller-provided featured flag. Approved properties of entitled sellers sort first in the public list. Expired subscriptions lose priority.
Views are successful public detail requests, NOT unique visitors. No historical views are fabricated. Premium reports totals by listing; Pro also gets the collected daily values. View fields are hidden from normal property responses; only the gated analytics endpoint exposes them. Existing basic inventory/status statistics stay available to Free.

## API

Base: http://localhost:3000/api. Authentication: Authorization: Bearer <JWT>.

| Method | Path | Role |
|---|---|---|
| GET | /subscriptions/plans | Public |
| GET | /subscriptions/me | Seller |
| POST | /subscriptions/subscribe | Seller |
| GET | /subscriptions/usage | Seller |
| GET | /subscriptions/history?page=1&limit=20 | Seller |
| GET | /subscriptions/analytics | Seller with analytics rights |
| POST | /subscriptions/payments | Seller |
| GET | /subscriptions/payments/:id | Owner/Admin |
| GET | /subscriptions/payments/:id/slip | Owner/Admin |
| GET | /admin/subscriptions/payments?status=pending&page=1&limit=20 | Admin |
| PATCH | /admin/subscriptions/payments/:id/approve | Admin |
| PATCH | /admin/subscriptions/payments/:id/reject | Admin |
| GET | /admin/subscriptions/members?page=1&limit=20 | Admin |
| GET | /admin/subscriptions/revenue | Admin |
| GET | /admin/subscriptions/plans | Admin |
| PATCH | /admin/subscriptions/plans/:id | Admin |
| GET | /admin/subscriptions/payment-settings | Admin |
| PUT | /admin/subscriptions/payment-settings | Admin |

POST subscribe accepts ONLY {planCode: 'premium' or 'pro'} plus an Idempotency-Key header (8-100 ASCII letters, digits, underscores/hyphens). Server picks price, seller and benefits. Reusing the same key/plan returns the same order. Reusing a key for another plan returns 409.
POST payments accepts multipart/form-data with paymentId and slip (File). Do not manually set Content-Type: the client must include the multipart boundary.
PATCH approve uses an empty JSON object. PATCH reject accepts {reason: '<actual rejection reason>'}.
Plan editing accepts name, priceSatang (integer satang), durationDays, listingLimit, imageLimit, features, isActive. Protected code/version cannot be set by clients.
Settings accept enabled, mode (manual/simulation), bankName, accountName, accountNumber, promptPayId, qrDataUrl (actual raster image data URL).

Common codes: LISTING_LIMIT_REACHED (403), IMAGE_LIMIT_REACHED (403), PREMIUM_REQUIRED (403), PAYMENT_ALREADY_REVIEWED (409), DOWNGRADE_NOT_ALLOWED (409), PAYMENT_NOT_CONFIGURED (503), TRANSACTIONS_REQUIRED (503).
A database without replica-set/sharded transactions fails closed for property mutations and payment approval; it does not use an unsafe count-then-insert fallback.

## Postman

Import docs/HomeMatch-Subscriptions.postman_collection.json.
Set sellerEmail/sellerPassword and adminEmail/adminPassword privately in Postman. Credentials/tokens are not supplied in the collection. Run Seller Login and Admin Login; scripts save the respective JWTs.

1. GET plans, me, usage. A seller without paid membership is Free.
2. Admin Settings: enable simulation to test without moving money. The provided request uses simulation only, never invented account details.
3. Create Order: stores paymentId, amount from server, and stable orderKey. Clear orderKey to start a different/new order.
4. Submit Evidence: choose a real image file in the slip form-data field. It should return pending. GET me is still Free.
5. Admin Approve: opens Premium. GET me/usage should show 20/15. Approving the same ID again should return 409 and not add days.
6. For rejection, create a NEW order/key, send evidence and use Admin Reject. The current entitlement does not upgrade.
7. Free test: create three pending listings through existing /properties, then a fourth should return 403. Sold/rejected listings release quota. Resubmitting rejected must check again.
8. Tampered Price request should return 400. Seller Cannot Approve should return 403. Protected routes without a JWT should return 401. A different seller must get 404 for another seller's payment/slip.
9. Test expiry only in a test database. Never edit production dates just to run tests. Existing listings must remain, over-limit Free users cannot create, and unchanged legacy images can be retained.
10. Concurrent requests cannot be validated by sequential Postman requests; use npm run test:subscriptions.

## Verification

npm run test:subscriptions in homematch-backend launches an isolated MongoDB replica set via mongodb-memory-server; it does not read .env or write tests to the real homematch database. The first run downloads a MongoDB binary. Test slip files are removed afterward.
Tests cover defaults, authorization, actual concurrent create/approve requests, request tampering, image quota including rooms, rejection/resubmission, snapshot stability, renewal, expiry, legacy images, slip privacy, featured expiry and analytics gating.

npm run build in homematch-web checks all pages and imports.
ESLint was run on new membership files and modified property/sidebar files.
Live backend plans and unauthenticated protection endpoints were smoke-tested. Browser interaction has not been manually verified.

## Full source paths

Backend:
- src/models/SubscriptionPlan.js
- src/models/SellerSubscription.js
- src/models/SubscriptionPayment.js
- src/models/SubscriptionPaymentSettings.js
- src/services/subscriptionService.js
- src/controllers/subscriptionController.js
- src/controllers/subscriptionPaymentController.js
- src/routes/subscriptionRoutes.js
- src/routes/subscriptionPaymentRoutes.js
- src/middleware/checkListingLimit.js
- scripts/seedSubscriptionPlans.js
- tests/subscriptions.test.js

Web (under homematch-web):
- src/Components/Seller/SubscriptionPlans.jsx
- src/Components/Seller/MySubscription.jsx
- src/Components/Seller/SubscriptionCheckout.jsx
- src/Components/Admin/SubscriptionManagement.jsx
- src/Components/Subscription/SubscriptionLayout.jsx
- src/Components/Subscription/SubscriptionUI.jsx
- src/services/useSubscriptionResource.js
- src/services/subscriptionFormat.js

## Existing file changes and reasons

Backend src/app.js: mount new routers, await plan/index initialization, 1MB JSON size for uploaded QR data URL, preserve status/codes for membership errors.
Backend src/models/Property.js: seller/status compound index; private viewCount/dailyViews fields.
Backend src/controllers/propertyController.js: transactions for count-affecting mutations, package image checks, dynamic featured priority and genuine view collection; preserve existing editable field whitelist and status/price behavior.
Backend src/routes/propertyRoutes.js: early listing limit middleware on creation.
Backend src/routes/uploadRoutes.js: per-plan image counts and post-upload entitlement recheck; original profile endpoint retained.
Backend src/middleware/uploadMiddleware.js: allow total of 30 images + 5 floor plans; profile still uses single file and 5MB limit.
Backend package.json/package-lock.json: seed/test commands and mongodb-memory-server as dev dependency.
Backend .env: replicaSet connection parameter; backed up, never committed.
Backend .gitignore: exclude private slips, env, dependency folders and runtime logs.
Root .gitignore: exclude offline database backups.
Web src/App.jsx: new seller/admin protected routes using the existing ProtectedRoute.
Web SellerSidebar.jsx/AdminSidebar.jsx: new menus; unused SellerSidebar activeMenu prop removed (pathname already determines active state).
Web AddProperty.jsx/EditProperty.jsx: current quota/image limits, upgrade link, block exhausted quota, retain legacy images.
Windows mongod.cfg: added replication.replSetName only after an offline backup, retained original bind/address/data path.

Authentication, JWT/roles, User, Chat, Appointment, Offer and the React Native mobile source are not changed by this membership work.
