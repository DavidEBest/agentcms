CREATE TABLE `generated_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`draft_key` text,
	`published_key` text,
	`style_prompt` text,
	`chat_log` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generated_sites_user_id_unique` ON `generated_sites` (`user_id`);