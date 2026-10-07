# Phase 2: customer commerce core

Phase 2 extends the Phase 1 SQLite database in place. It keeps the single PM2 API process, SQLite WAL, Nginx same-origin `/api` proxy, and the existing daily database backup. The backend must remain a single writer; do not increase the PM2 instance count or enable cluster mode.

## Database and migration

The forward migrations are `server/db/migrations/0001_phase2_commerce.sql`, `0002_talented_sleeper.sql` (the reservation-expiry index), and `0003_phase25_shipping_methods.sql`. Apply them with `npm run db:migrate`; inspect applied migrations with `npm run db:status`. The migration runner records completed migrations and does not drop existing tables. It must be exercised against a copied/test database before production.

Phase 2 adds `customer_addresses`, `carts`, `cart_items`, `cart_migrations`, `orders`, `order_items`, `inventory_reservations`, `order_events`, `checkout_idempotency`, and `order_sequences`. Phase 2.5 adds `shipping_methods` plus nullable shipping-method snapshots to `orders`. Existing users, staff, sessions, catalog, inventory, stock movement rows, and historical orders are preserved. No customer, order, or shipping method fixtures are seeded.

Commerce writes use immediate SQLite transactions, WAL, foreign keys, a 5-second busy timeout, and `synchronous=FULL`. Order creation re-reads active catalog and inventory rows in the transaction, creates immutable item snapshots, reserves stock, writes movements/events, converts the cart, and stores the idempotency result atomically. Checkout retries with the same customer and key return the same order.

## Configuration and checkout gate

`DATABASE_PATH`, `APP_ORIGIN`, and `CHECKOUT_RESERVATION_MINUTES` are server-only. Shipping prices are configured in the database through Admin → Settings → Shipping Methods; `SHIPPING_COST_TOMANS` is no longer used. The Phase 2.5 migration creates no methods, so checkout remains disabled until an owner or store manager intentionally configures and activates one. `GET /api/v1/shipping/methods` exposes only active methods, while `POST /api/v1/checkout/quote` recalculates the cart and delivery total from server data. Orders snapshot the selected method name/code and amount.

Reservation expiry defaults to 20 minutes and is configurable from 1 to 120 minutes. `ops/shawhposh-reservations.timer` runs the idempotent expiry command once per minute. The timer must be installed/enabled alongside the API release. Expiry cancels unpaid orders and atomically releases their stock reservations.

## Customer behavior

Customer account, addresses, orders, and cart use authenticated API routes. Ownership is always taken from the session, and foreign IDs return not found. Guests retain a temporary browser cart; login imports it through an idempotent server endpoint, maps current variant IDs, rechecks stock, and ignores saved prices. The browser copy is removed only after the server confirms migration. Custom designer output remains outside persisted cart/order items in this phase and is not represented as a purchasable line.

Checkout is disabled while no active shipping method exists. When an owner or store manager configures a method, orders remain `awaiting_payment` / `unpaid`; no payment success can be recorded by the admin UI. Shipping-method configuration is database-backed; return policies shown beside it remain local prototype settings.

## Admin and prototype boundary

Admin customer directory/profile, orders/order detail, and catalog/inventory are backed by production APIs. Customer accounts are created through customer registration; staff-issued invitations are not available until a secure activation/password-reset delivery path exists. Order screens contain no fixture rows and offer only authorized unpaid cancellation, internal notes, and pre-fulfillment address edits. They do not offer a manual paid action.

The demo reset affects browser fixture state only. It does not call production APIs or modify users, staff, sessions, customers, carts, orders, catalog, variants, inventory, or stock movements.

Still demo-backed: payment/refunds, custom design persistence/review, production/QC, carrier fulfillment, analytics other than the real order-count KPI, support history, reviews, staff management UI, suppliers/purchase orders/materials, and media uploads. Dashboard analytics and recent-order sample rows remain demo data and are labeled accordingly.

## Backups and restore

The existing daily systemd backup remains at `/var/backups/shawhposh`, outside `/var/lib/shawhposh`; it retains 14 days. Before a production migration, start `shawhposh-backup.service` and verify the new backup with SQLite `PRAGMA integrity_check`. Restore only while the API is stopped, preserve the current DB and WAL/SHM first, restore a verified copy to `/var/lib/shawhposh/shawhposh.sqlite`, then restart only `shawhposh-api` and verify `/api/health` and product reads. There is no off-host backup in this phase.

## Validation and deployment

Run `npm run lint`, `npm test`, `npm run test:backend`, `npm run server:check`, `npm run server:build`, and `npm run build` before deployment. The API binds only to loopback through the existing PM2/Nginx topology. Deploy versioned backend/frontend artifacts, apply the forward migration after a verified backup, install the reservation timer, and restart only `shawhposh-api`. Keep the prior frontend/backend symlink targets for rollback. Do not restore a pre-Phase-2 database after applying the migration unless the whole service is rolled back deliberately; the old API cannot read the new schema safely.

## Phase 3 payment inputs

Payment integration requires the owner-selected Iranian PSP, merchant credentials provisioned directly on the server, callback/return URL requirements, test/production mode details, and the approved shipping fee. Credentials must never be sent in chat, committed, or added to browser/Vite variables.
