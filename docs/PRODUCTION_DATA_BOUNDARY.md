# Production data boundary

The production application reads customer and staff sessions, profiles, addresses, catalog, variants/SKUs, inventory, stock movements, carts, shipping configuration, quotes, orders, order items, inventory reservations, and order events from the SQLite backend. The admin dashboard, customer directory, order screens, catalog/inventory screens, shipping settings, and health page use server APIs. API failures are surfaced; the application does not load a browser fixture database.

The catalog seed at `server/db/catalogSeed.ts` is an explicit, idempotent bootstrap input, not a runtime data source. `npm run db:seed` is not called on server startup. New variants begin with zero inventory. Product media is empty until real product imagery is registered; the storefront uses a generic local unavailable-image graphic instead of stock photography.

Admin navigation exposes only the database-backed modules: overview, orders, catalog/inventory, customers, shipping settings, and health. Payments/refunds, shipping tracking, custom-design persistence, production/QC, reviews, analytics, support, CMS, procurement, media upload, and staff-management tools remain hidden until their server-side systems exist.

The storefront designer is a local preview. It does not save artwork, submit production work, or create orders. Checkout can create a real unpaid order only with a configured shipping method; payment remains unavailable until a provider is integrated and verified.

Browser storage is limited to theme/sidebar preferences and a one-time compatibility read of the legacy `shahpoosh_cart` value for migration into the authenticated server cart. That legacy value is never used as authoritative pricing, stock, or cart state and is removed after successful migration. It is not rewritten. Admin/catalog/cart/order business state is not persisted in localStorage.

The production SQLite file is a single-writer database. Database cleanup requires an online backup that passes SQLite integrity and foreign-key checks before any exact, verified test-row removal. Real users, staff, sessions, catalog, SKUs, stock, and operational records are preserved.
