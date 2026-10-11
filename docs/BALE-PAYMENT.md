# Bale Wallet payments

Shawhposh uses Bale's official Bot API for wallet invoices. It does not use a third-party BalePay package or offer card-to-card payments inside Bale bots. Card-to-card on the website is a separate manual-review method. See the [official Bale Bot API documentation](https://docs.bale.ai/).

## Owner setup

1. In Bale, open `@botfather` and create the Shawhposh payment bot. Record the bot username and bot token.
2. Request a wallet payment provider token through Bale's official setup. Keep the production token separate from the test token.
3. Generate a distinct webhook secret with at least 32 random bytes, for example `openssl rand -hex 32`.
4. On the server, set `BALE_BOT_TOKEN`, `BALE_BOT_USERNAME`, `BALE_PAYMENT_PROVIDER_TOKEN`, and `BALE_WEBHOOK_SECRET` in `/var/lib/shawhposh/.env`. These values are server-only. Never add a `VITE_` prefix or put them in the database, frontend, logs, or Git.
5. Deploy/restart `shawhposh-api`. In Admin → Settings → Payment Methods, enable Bale Wallet only after the API reports that real production credentials are configured. Enabling registers the HTTPS webhook through Bale's official `setWebhook` method and verifies it with `getWebhookInfo` before saving. The optional `npm run bale:webhook:set` command performs the same registration and verification. The Shawhposh Nginx webhook location must suppress access logging because the secret is part of the request path.
6. Production requests are pinned to `https://tapi.bale.ai`; alternate API hosts are accepted only outside production. In production, the documented `WALLET-TEST-1111111111111111` token is rejected and cannot activate payments.
7. Test the full bot flow in a non-production environment using Bale's official wallet test provider token. Replace it with the real provider token only after the test invoice, pre-checkout, webhook, and transaction inquiry all pass.

The bot flow is: a one-time opaque `start` token opens a private chat; Shawhposh sends an invoice in integer Iranian rials; `pre_checkout_query` is validated and answered; after `SuccessfulPayment`, Shawhposh calls `inquireTransaction`. Only a matching `paid` inquiry can mark the order paid. The Telegram charge ID must match the pre-checkout query ID, and both the received and inquired amounts must equal the order's Toman amount multiplied by 10.

## Card-to-card

An owner or store manager must enter the real destination card, cardholder, and manual-review hold duration in Admin → Settings → Payment Methods. No card number or hold duration is seeded. The method remains disabled until the required real values pass server validation. A screenshot is evidence only; an authorized owner, store manager, or finance user must verify the bank deposit before approval.

Receipt images are decoded and re-encoded as WebP, stored privately under `PAYMENT_RECEIPT_DIR` (production: `/var/lib/shawhposh/uploads/payment-receipts/`), and are never served as static files. Authorized payment staff retrieve them through the authenticated API.

## Backups and restore

The daily Shawhposh backup job archives the SQLite database and the private receipt directory under `/var/backups/shawhposh/`, with 14-day retention. Confirm that the existing `shawhposh-db-backup.timer` is active after deployment; a successful deploy alone does not prove the scheduler is running. The database and receipt archive are separate artifacts and both are required to restore payment history and evidence.

For a restore, stop only `shawhposh-api`, preserve the current database and receipt directory, restore the matching SQLite backup to `/var/lib/shawhposh/shawhposh.sqlite`, and extract the matching receipt archive into `/var/lib/shawhposh/uploads/payment-receipts/`. Restore private permissions (`0700` directory, `0600` files), run SQLite `integrity_check` and `foreign_key_check`, then start the API and verify `/api/health` before reopening payments. Never restore only the database when receipt evidence is needed.

## Current activation boundary

Payment methods default to disabled. No production card details, Bale bot credentials, or wallet provider token are included in this repository. Production order creation also remains blocked until the owner configures at least one real shipping method.
