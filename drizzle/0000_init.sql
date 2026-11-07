CREATE TABLE `product_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`singular` text NOT NULL,
	`group_id` text NOT NULL,
	`description` text NOT NULL,
	`options` text NOT NULL,
	`price` text NOT NULL,
	`art` text NOT NULL,
	`highlights` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_vibes` (
	`product_id` integer NOT NULL,
	`vibe_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `vibe_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vibe_id`) REFERENCES `vibes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_vibes_vibe_idx` ON `product_vibes` (`vibe_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`type_id` text NOT NULL,
	`vibe_id` text NOT NULL,
	`description` text NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`price_override` text,
	`price_from` integer NOT NULL,
	`art` text,
	`images` text,
	`popularity` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_sample` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `product_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vibe_id`) REFERENCES `vibes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_type_idx` ON `products` (`type_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `products_vibe_idx` ON `products` (`vibe_id`);--> statement-breakpoint
CREATE INDEX `products_popularity_idx` ON `products` (`popularity`);--> statement-breakpoint
CREATE INDEX `products_created_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `products_price_idx` ON `products` (`price_from`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vibes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`blurb` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
