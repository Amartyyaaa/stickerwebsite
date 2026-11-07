CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`has_alpha` integer,
	`original_key` text NOT NULL,
	`preview_key` text,
	`thumb_key` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `uploads_created_idx` ON `uploads` (`created_at`);