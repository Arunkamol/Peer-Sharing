CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`target` text,
	`payload` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_owner_kind_idx` ON `events` (`owner`,`kind`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `listings_owner_idx` ON `listings` (`owner`);--> statement-breakpoint
CREATE TABLE `marks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`target` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marks_owner_target_kind` ON `marks` (`owner`,`target`,`kind`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`item` text NOT NULL,
	`seats` integer DEFAULT 1 NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	`completed` integer
);
--> statement-breakpoint
CREATE INDEX `orders_owner_idx` ON `orders` (`owner`);--> statement-breakpoint
CREATE INDEX `orders_item_status_idx` ON `orders` (`item`,`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `requests_owner_idx` ON `requests` (`owner`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`order_id` text NOT NULL,
	`item` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_order_id_unique` ON `reviews` (`order_id`);