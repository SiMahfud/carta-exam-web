-- Create saved_filters table
CREATE TABLE `saved_filters` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`page` text NOT NULL,
	`filters` text NOT NULL,
	`is_default` boolean DEFAULT false,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `saved_filters_user_idx` ON `saved_filters` (`user_id`);
CREATE INDEX `saved_filters_page_idx` ON `saved_filters` (`page`);
