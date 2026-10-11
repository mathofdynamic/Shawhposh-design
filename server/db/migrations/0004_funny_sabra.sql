CREATE TABLE `bale_payment_sessions` (
	`payment_attempt_id` text PRIMARY KEY NOT NULL,
	`invoice_payload_hash` text NOT NULL,
	`bale_chat_id` text,
	`bale_user_id` text,
	`invoice_message_id` text,
	`invoice_status` text DEFAULT 'not_sent' NOT NULL,
	`claimed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bale_invoice_status" CHECK("bale_payment_sessions"."invoice_status" in ('not_sent','sending','sent','unknown','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bale_payment_sessions_invoice_payload_hash_unique` ON `bale_payment_sessions` (`invoice_payload_hash`);--> statement-breakpoint
CREATE TABLE `bale_start_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_attempt_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`claimed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bale_start_tokens_token_hash_unique` ON `bale_start_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `bale_start_tokens_attempt_idx` ON `bale_start_tokens` (`payment_attempt_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `bale_webhook_updates` (
	`update_id` text PRIMARY KEY NOT NULL,
	`update_type` text NOT NULL,
	`processing_status` text DEFAULT 'processing' NOT NULL,
	`safe_error_code` text,
	`created_at` integer NOT NULL,
	`processed_at` integer,
	CONSTRAINT "bale_webhook_processing_status" CHECK("bale_webhook_updates"."processing_status" in ('processing','processed','failed'))
);
--> statement-breakpoint
CREATE INDEX `bale_webhook_created_idx` ON `bale_webhook_updates` (`created_at`);--> statement-breakpoint
CREATE TABLE `manual_payment_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_attempt_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`width` integer,
	`height` integer,
	`uploaded_at` integer NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by_staff_id` text,
	`reviewed_at` integer,
	`review_note` text,
	FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "receipt_mime_type" CHECK("manual_payment_receipts"."mime_type" = 'image/webp'),
	CONSTRAINT "receipt_size_positive" CHECK("manual_payment_receipts"."size_bytes" between 1 and 5242880),
	CONSTRAINT "receipt_sha256_length" CHECK(length("manual_payment_receipts"."sha256") = 64),
	CONSTRAINT "receipt_review_status" CHECK("manual_payment_receipts"."review_status" in ('pending','approved','rejected')),
	CONSTRAINT "receipt_dimensions_positive" CHECK(("manual_payment_receipts"."width" is null or "manual_payment_receipts"."width" > 0) and ("manual_payment_receipts"."height" is null or "manual_payment_receipts"."height" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manual_payment_receipts_storage_key_unique` ON `manual_payment_receipts` (`storage_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_pending_receipt_per_attempt` ON `manual_payment_receipts` (`payment_attempt_id`) WHERE "manual_payment_receipts"."review_status" = 'pending';--> statement-breakpoint
CREATE INDEX `manual_receipts_review_queue_idx` ON `manual_payment_receipts` (`review_status`,`uploaded_at`);--> statement-breakpoint
CREATE TABLE `payment_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`amount_tomans` integer NOT NULL,
	`amount_provider_units` integer,
	`idempotency_key` text NOT NULL,
	`external_transaction_id` text,
	`external_provider_reference` text,
	`provider_payload_reference` text,
	`failure_code` text,
	`failure_message` text,
	`method_snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer,
	`paid_at` integer,
	`failed_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_attempt_method" CHECK("payment_attempts"."method" in ('card_to_card','bale_wallet')),
	CONSTRAINT "payment_attempt_status" CHECK("payment_attempts"."status" in ('created','awaiting_customer','pending_verification','verified','rejected','failed','expired')),
	CONSTRAINT "payment_attempt_amounts" CHECK("payment_attempts"."amount_tomans" > 0 and ("payment_attempts"."amount_provider_units" is null or "payment_attempts"."amount_provider_units" > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_attempts_idempotency_key_unique` ON `payment_attempts` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_attempt_external_transaction_unique` ON `payment_attempts` (`external_transaction_id`) WHERE "payment_attempts"."external_transaction_id" is not null;--> statement-breakpoint
CREATE INDEX `payment_attempts_order_created_idx` ON `payment_attempts` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payment_attempts_status_created_idx` ON `payment_attempts` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_attempt_id` text NOT NULL,
	`event_type` text NOT NULL,
	`source` text NOT NULL,
	`external_event_id` text,
	`metadata_safe_json` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_events_attempt_created_idx` ON `payment_events` (`payment_attempt_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_events_source_external_unique` ON `payment_events` (`source`,`external_event_id`) WHERE "payment_events"."external_event_id" is not null;--> statement-breakpoint
CREATE TABLE `payment_method_configs` (
	`method` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`bank_name` text,
	`cardholder_name` text,
	`card_number` text,
	`account_iban` text,
	`instructions` text,
	`manual_review_message` text,
	`manual_review_hold_hours` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "payment_method_code" CHECK("payment_method_configs"."method" in ('card_to_card','bale_wallet')),
	CONSTRAINT "manual_review_hold_hours_range" CHECK("payment_method_configs"."manual_review_hold_hours" is null or "payment_method_configs"."manual_review_hold_hours" between 1 and 72),
	CONSTRAINT "bale_has_no_card_settings" CHECK("payment_method_configs"."method" = 'card_to_card' or ("payment_method_configs"."bank_name" is null and "payment_method_configs"."cardholder_name" is null and "payment_method_configs"."card_number" is null and "payment_method_configs"."account_iban" is null and "payment_method_configs"."instructions" is null and "payment_method_configs"."manual_review_message" is null and "payment_method_configs"."manual_review_hold_hours" is null))
);
