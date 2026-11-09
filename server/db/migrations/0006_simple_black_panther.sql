CREATE TABLE `manual_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "manual_customer_name" CHECK(length(trim("manual_customers"."name")) > 0),
	CONSTRAINT "manual_customer_status" CHECK("manual_customers"."status" in ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manual_customers_phone_unique` ON `manual_customers` (`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `manual_customers_email_unique` ON `manual_customers` (`email`);--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_name` text NOT NULL,
	`product_id` text,
	`product_name_snapshot` text NOT NULL,
	`quantity` integer NOT NULL,
	`purchase_unit_price_tomans` integer NOT NULL,
	`sale_unit_price_tomans` integer NOT NULL,
	`delivery_cost_tomans` integer DEFAULT 0 NOT NULL,
	`printing_cost_tomans` integer DEFAULT 0 NOT NULL,
	`net_profit_tomans` integer NOT NULL,
	`invoice_date` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by_staff_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "purchase_invoice_quantity" CHECK("purchase_invoices"."quantity" > 0),
	CONSTRAINT "purchase_invoice_amounts" CHECK("purchase_invoices"."purchase_unit_price_tomans" >= 0 and "purchase_invoices"."sale_unit_price_tomans" >= 0 and "purchase_invoices"."delivery_cost_tomans" >= 0 and "purchase_invoices"."printing_cost_tomans" >= 0)
);
--> statement-breakpoint
CREATE INDEX `purchase_invoice_date_idx` ON `purchase_invoices` (`invoice_date`);--> statement-breakpoint
CREATE INDEX `purchase_invoice_supplier_idx` ON `purchase_invoices` (`supplier_name`);