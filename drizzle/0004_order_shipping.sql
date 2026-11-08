ALTER TABLE `orders` ADD `courier` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_number` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_url` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `admin_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `refunded_amount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `razorpay_refund_id` text;