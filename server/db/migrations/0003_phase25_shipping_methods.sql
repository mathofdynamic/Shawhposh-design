CREATE TABLE `shipping_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`carrier_type` text DEFAULT 'manual' NOT NULL,
	`pricing_type` text DEFAULT 'fixed' NOT NULL,
	`fixed_price_tomans` integer,
	`free_shipping_threshold_tomans` integer,
	`estimated_min_days` integer,
	`estimated_max_days` integer,
	`active` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "shipping_fixed_price_nonnegative" CHECK("shipping_methods"."fixed_price_tomans" is null or "shipping_methods"."fixed_price_tomans" >= 0),
	CONSTRAINT "shipping_threshold_nonnegative" CHECK("shipping_methods"."free_shipping_threshold_tomans" is null or "shipping_methods"."free_shipping_threshold_tomans" >= 0),
	CONSTRAINT "shipping_min_days_positive" CHECK("shipping_methods"."estimated_min_days" is null or "shipping_methods"."estimated_min_days" >= 1),
	CONSTRAINT "shipping_max_days_positive" CHECK("shipping_methods"."estimated_max_days" is null or "shipping_methods"."estimated_max_days" >= 1),
	CONSTRAINT "shipping_display_order_nonnegative" CHECK("shipping_methods"."display_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipping_methods_code_unique` ON `shipping_methods` (`code`);--> statement-breakpoint
CREATE INDEX `shipping_methods_active_order_idx` ON `shipping_methods` (`active`,`display_order`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_method_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_method_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_method_name` text;