CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`conversation` text NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_messages_owner_conversation_idx` ON `chat_messages` (`owner`,`conversation`,`created`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`item` text NOT NULL,
	`slot_date` text DEFAULT '' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_owner_item_idx` ON `conversations` (`owner`,`item`);