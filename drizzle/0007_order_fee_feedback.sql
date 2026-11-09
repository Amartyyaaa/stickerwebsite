CREATE TABLE `order_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_feedback_order_id_unique` ON `order_feedback` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_feedback_created_idx` ON `order_feedback` (`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `platform_fee` integer DEFAULT 0 NOT NULL;