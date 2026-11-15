CREATE TABLE `other_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amount_tomans` integer NOT NULL,
	`expense_date` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by_staff_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "other_expense_description" CHECK(length(trim("other_expenses"."description")) > 0),
	CONSTRAINT "other_expense_amount" CHECK("other_expenses"."amount_tomans" >= 0)
);
--> statement-breakpoint
CREATE INDEX `other_expense_date_idx` ON `other_expenses` (`expense_date`);--> statement-breakpoint
ALTER TABLE `order_items` ADD `material_cost_unit_tomans` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `material_cost_tomans` integer;--> statement-breakpoint
UPDATE `products`
SET `material_cost_tomans` = (
	SELECT CAST(ROUND(
		SUM(`purchase_unit_price_tomans` * `quantity` + `delivery_cost_tomans` + `printing_cost_tomans`) * 1.0
		/ SUM(`quantity`)
	) AS INTEGER)
	FROM `purchase_invoices`
	WHERE `product_id` = `products`.`id` AND `quantity` > 0
)
WHERE `material_cost_tomans` IS NULL
	AND EXISTS (
		SELECT 1 FROM `purchase_invoices`
		WHERE `product_id` = `products`.`id` AND `quantity` > 0
	);
--> statement-breakpoint
ALTER TABLE `purchase_invoices` ADD `invoice_image_storage_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `users` ADD `date_of_birth` text;--> statement-breakpoint
ALTER TABLE `users` ADD `address` text;
--> statement-breakpoint
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `status`, `display_order`, `presentation`, `created_at`, `updated_at`) VALUES
	('90000000-0000-4000-8000-000000000001', 'تیشرت', 'tshirt', '', 'active', 0, '{"nameEn":"T-shirt","image":null,"isFeatured":false}', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
	('90000000-0000-4000-8000-000000000002', 'هودی', 'hoodie', '', 'active', 1, '{"nameEn":"Hoodie","image":null,"isFeatured":false}', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
	('90000000-0000-4000-8000-000000000003', 'دورس', 'dors', '', 'active', 2, '{"nameEn":"Crewneck sweatshirt","image":null,"isFeatured":false}', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
	('90000000-0000-4000-8000-000000000004', 'سویشرت', 'sweatshirt', '', 'active', 3, '{"nameEn":"Sweatshirt","image":null,"isFeatured":false}', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
	('90000000-0000-4000-8000-000000000005', 'نیم‌زیپ', 'halfzip', '', 'active', 4, '{"nameEn":"Half zip","image":null,"isFeatured":false}', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000),
	('90000000-0000-4000-8000-000000000006', 'شلوار', 'pants', '', 'active', 5, '{"nameEn":"Pants","image":null,"isFeatured":false}', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE `categories` SET `status` = 'archived', `updated_at` = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE `slug` IN ('calligraphy','graphic','minimalist','pod');
--> statement-breakpoint
UPDATE `products` SET `status` = 'archived', `updated_at` = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE `slug` IN ('sp-101','sp-102','sp-103','sp-104','sp-105','sp-106');
