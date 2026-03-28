ALTER TABLE `generated_sites` ADD `draft_manifest` text;--> statement-breakpoint
ALTER TABLE `generated_sites` ADD `published_manifest` text;--> statement-breakpoint
ALTER TABLE `generated_sites` DROP COLUMN `draft_key`;--> statement-breakpoint
ALTER TABLE `generated_sites` DROP COLUMN `published_key`;