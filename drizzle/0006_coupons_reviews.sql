CREATE TABLE `coupons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`min_order` integer DEFAULT 0 NOT NULL,
	`max_discount` integer,
	`starts_at` integer,
	`ends_at` integer,
	`usage_limit` integer,
	`per_customer` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`order_id` integer NOT NULL,
	`order_item_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`name` text NOT NULL,
	`photos` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_order_item_id_unique` ON `reviews` (`order_item_id`);--> statement-breakpoint
CREATE INDEX `reviews_product_idx` ON `reviews` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_code` text;--> statement-breakpoint
CREATE INDEX `orders_coupon_idx` ON `orders` (`coupon_code`);