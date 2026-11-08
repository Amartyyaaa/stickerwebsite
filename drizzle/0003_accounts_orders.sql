CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`line1` text NOT NULL,
	`line2` text DEFAULT '' NOT NULL,
	`landmark` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`pincode` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `addresses_user_idx` ON `addresses` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_rate_limit_key_unique` ON `auth_rate_limit` (`key`);--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`type_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`type_name` text NOT NULL,
	`options` text NOT NULL,
	`option_labels` text NOT NULL,
	`art` text,
	`image` text,
	`custom` text,
	`unit` integer NOT NULL,
	`qty` integer NOT NULL,
	`total` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`access_key` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`status` text NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text NOT NULL,
	`item_count` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`discounts` text NOT NULL,
	`discount_total` integer NOT NULL,
	`shipping` integer NOT NULL,
	`cod_fee` integer NOT NULL,
	`prepaid_discount` integer NOT NULL,
	`total` integer NOT NULL,
	`razorpay_order_id` text,
	`razorpay_payment_id` text,
	`paid_at` integer,
	`idempotency_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_razorpay_order_id_unique` ON `orders` (`razorpay_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_idempotency_key_unique` ON `orders` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`email`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` integer,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
ALTER TABLE `uploads` ADD `order_id` integer REFERENCES orders(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `uploads_order_idx` ON `uploads` (`order_id`);