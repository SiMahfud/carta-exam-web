CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`question_id` text NOT NULL,
	`student_answer` text,
	`is_flagged` integer DEFAULT false,
	`is_correct` integer,
	`score` integer DEFAULT 0,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exam_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`token` text NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_until` integer NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer,
	`end_time` integer,
	`duration_minutes` integer NOT NULL,
	`min_duration_minutes` integer DEFAULT 0,
	`randomize_questions` integer DEFAULT false,
	`randomize_answers` integer DEFAULT false,
	`enable_lockdown` integer DEFAULT true,
	`require_token` integer DEFAULT false,
	`max_violations` integer DEFAULT 3,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`answer_key` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`user_id` text NOT NULL,
	`score` integer DEFAULT 0,
	`start_time` integer DEFAULT (unixepoch()),
	`end_time` integer,
	`question_order` text,
	`flagged_questions` text,
	`violation_count` integer DEFAULT 0,
	`violation_log` text,
	`status` text DEFAULT 'in_progress',
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);