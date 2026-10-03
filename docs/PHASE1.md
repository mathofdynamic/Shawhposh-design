# Phase 1
Express/TypeScript modular monolith with Drizzle and SQLite WAL, selected by owner to reduce VPS resource usage. PostgreSQL services for other apps are untouched. One backend process on loopback 3039, existing PM2, Nginx same-origin /api proxy.

## Database
Nine versioned tables: users, staff_users, sessions, categories, products, product_media, product_variants, inventory, stock_movements. Integer tomans; globally unique SKU; available stock cannot fall below zero. Every manual stock change records a movement in the transaction. No fixture fallback.
`npm run db:migrate`, `npm run db:status`, `npm run db:seed`. Seed is explicit/idempotent: 6 products, 3 categories, 67 SKUs; unknown stock starts at zero. Count physical inventory before changing quantities. Production seed never runs on restart.
`npm run admin:create-owner` accepts OWNER_EMAIL/OWNER_NAME/OWNER_PASSWORD. Omit identity/password to generate them; set OWNER_CREDENTIAL_FILE to an absolute protected path outside source. Password is never logged. Existing owner is preserved.

## Deployment layout
Frontend /var/www/shawhposh/current; previous static release retained.
Backend /home/ubuntu/shawhposh/current, versioned releases; PM2 shawhposh-api.
DB /var/lib/shawhposh/shawhposh.sqlite (persistent outside releases).
Server environment /var/lib/shawhposh/.env (permissions 0600).
Backups /var/backups/shawhposh, daily systemd timer, 14-day retention. These are on the VPS, outside the database directory; off-host disaster recovery is a later operational improvement.
Backup uses SQLite online backup API, including committed WAL data: BACKUP_DIRECTORY=/var/backups/shawhposh node server-dist/db/backup.js.
Restore: stop only shawhposh-api; preserve current DB plus WAL/SHM; copy a selected backup to DATABASE_PATH with owner/0600; remove only old WAL/SHM after preserving them; restart shawhposh-api; verify /api/health and product reads. Never restore over an open database.
Rollback: restore previous frontend current symlink and preserved Nginx shawhposh config; nginx -t then reload; stop only shawhposh-api. Keep DB and backups. For later backend releases point current to previous backend release and restart only that PM2 process. Schema rollback requires explicit review; no auto-drop/down migrations.

## Security
Argon2id passwords, hashed random session tokens, HttpOnly/Secure/SameSite=Lax cookies, customer 7-day/staff 12-hour expiry, revocation on logout, active-account checks, backend RBAC, strict Origin plus JSON mutating request checks, auth rate limits, Helmet, body limit, safe errors, secret-free request logs. No browser auth token or DB credentials.
Email/phone verification and recovery are not implemented; verified timestamps remain null. Fake OAuth is disabled. Checkout cannot accept payment or claim a completed purchase.

## Data boundaries
Real: customer/staff auth, products, categories, variants, finished-garment inventory, stock movements.
Demo: orders/payments/refunds, designs/production/QC/shipping, analytics/support, collections/media manager/suppliers/purchase orders/material inventory, customer directory/staff management. Demo reset only changes fixture/localStorage state. Cart remains local; checkout/order/payment and POD storage remain prototypes.
