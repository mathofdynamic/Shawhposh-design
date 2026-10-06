CREATE TABLE `cart_items` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`custom_design_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cart_item_quantity" CHECK("cart_items"."quantity" between 1 and 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_items_cart_variant_unique` ON `cart_items` (`cart_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `cart_migrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_migrations_user_key_unique` ON `cart_migrations` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cart_status" CHECK("carts"."status" in ('active','converted','abandoned','expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_cart_per_customer` ON `carts` (`user_id`) WHERE "carts"."status" = 'active';--> statement-breakpoint
CREATE TABLE `checkout_idempotency` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`order_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_idempotency_user_key_unique` ON `checkout_idempotency` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`recipient_name` text NOT NULL,
	`phone` text NOT NULL,
	`province` text NOT NULL,
	`city` text NOT NULL,
	`address_line` text NOT NULL,
	`postal_code` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "address_required_text" CHECK(length(trim("customer_addresses"."recipient_name")) > 0 and length(trim("customer_addresses"."province")) > 0 and length(trim("customer_addresses"."city")) > 0 and length(trim("customer_addresses"."address_line")) > 0)
);
--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`released_at` integer,
	`consumed_at` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reservation_quantity" CHECK("inventory_reservations"."quantity" > 0),
	CONSTRAINT "reservation_status" CHECK("inventory_reservations"."status" in ('active','released','consumed','expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservation_order_variant_unique` ON `inventory_reservations` (`order_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_user_id` text,
	`actor_staff_id` text,
	`previous_value` text,
	`new_value` text,
	`note` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "order_event_actor_type" CHECK("order_events"."actor_type" in ('customer','staff','system'))
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`variant_id` text,
	`sku_snapshot` text NOT NULL,
	`product_name_snapshot` text NOT NULL,
	`variant_snapshot` text NOT NULL,
	`unit_price_tomans` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_tomans` integer NOT NULL,
	`custom_design_version_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "order_item_amounts" CHECK("order_items"."unit_price_tomans" >= 0 and "order_items"."quantity" > 0 and "order_items"."line_total_tomans" = "order_items"."unit_price_tomans" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE `order_sequences` (
	`period` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL,
	CONSTRAINT "order_sequence_positive" CHECK("order_sequences"."value" > 0)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`user_id` text,
	`customer_email` text,
	`customer_phone` text,
	`customer_name` text NOT NULL,
	`shipping_address_snapshot` text NOT NULL,
	`subtotal_tomans` integer NOT NULL,
	`discount_tomans` integer DEFAULT 0 NOT NULL,
	`shipping_tomans` integer NOT NULL,
	`total_tomans` integer NOT NULL,
	`order_status` text DEFAULT 'awaiting_payment' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`production_status` text DEFAULT 'not_required' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`customer_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`cancelled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "order_amounts_nonnegative" CHECK("orders"."subtotal_tomans" >= 0 and "orders"."discount_tomans" >= 0 and "orders"."shipping_tomans" >= 0 and "orders"."total_tomans" >= 0),
	CONSTRAINT "order_status_values" CHECK("orders"."order_status" in ('draft','awaiting_payment','confirmed','cancelled','completed')),
	CONSTRAINT "payment_status_values" CHECK("orders"."payment_status" in ('unpaid','pending','paid','failed','partially_refunded','refunded')),
	CONSTRAINT "production_status_values" CHECK("orders"."production_status" in ('not_required','awaiting_design_review','approved','queued','in_production','qc','completed','blocked')),
	CONSTRAINT "fulfillment_status_values" CHECK("orders"."fulfillment_status" in ('unfulfilled','ready_to_pack','packed','shipped','delivered','returned'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);