ALTER TABLE `users` ADD `subdomain` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_subdomain_unique` ON `users` (`subdomain`);