-- Users table
CREATE TABLE `users` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` varchar(255) NOT NULL UNIQUE,
	`password` text NOT NULL,
	`role` varchar(50) DEFAULT 'student' NOT NULL,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP())
);
--> statement-breakpoint

-- Subjects table
CREATE TABLE `subjects` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` varchar(50) NOT NULL UNIQUE,
	`description` text,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP())
);
--> statement-breakpoint

-- Classes table
CREATE TABLE `classes` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`academic_year` varchar(20) NOT NULL,
	`teacher_id` varchar(36),
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Class Students junction table
CREATE TABLE `class_students` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`class_id` varchar(36) NOT NULL,
	`student_id` varchar(36) NOT NULL,
	`enrolled_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Question Banks table
CREATE TABLE `question_banks` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`subject_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by` varchar(36),
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	`updated_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Bank Questions table
CREATE TABLE `bank_questions` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`bank_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`content` text NOT NULL,
	`answer_key` text NOT NULL,
	`tags` text,
	`difficulty` varchar(50) DEFAULT 'medium',
	`default_points` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`created_by` varchar(36),
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	`updated_at` integer DEFAULT (UNIX_TIMESTAMP()),
	`last_used` integer,
	FOREIGN KEY (`bank_id`) REFERENCES `question_banks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Scoring Templates table
CREATE TABLE `scoring_templates` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`default_weights` text NOT NULL,
	`allow_partial_credit` integer DEFAULT true,
	`partial_credit_rules` text,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP())
);
--> statement-breakpoint

-- Exam Templates table  
CREATE TABLE `exam_templates` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`subject_id` varchar(36) NOT NULL,
	`bank_ids` text NOT NULL,
	`filter_tags` text,
	`question_composition` text NOT NULL,
	`use_question_pool` integer DEFAULT false,
	`pool_size` integer,
	`scoring_template_id` varchar(36),
	`custom_weights` text,
	`total_score` integer DEFAULT 100,
	`duration_minutes` integer NOT NULL,
	`min_duration_minutes` integer DEFAULT 0,
	`randomize_questions` integer DEFAULT false,
	`randomize_answers` integer DEFAULT false,
	`essay_at_end` integer DEFAULT true,
	`randomization_rules` text,
	`target_type` varchar(50) DEFAULT 'all',
	`target_ids` text,
	`enable_lockdown` integer DEFAULT true,
	`require_token` integer DEFAULT false,
	`max_violations` integer DEFAULT 3,
	`allow_review` integer DEFAULT false,
	`show_result_immediately` integer DEFAULT false,
	`allow_retake` integer DEFAULT false,
	`max_tab_switches` integer DEFAULT 3,
	`display_settings` text,
	`created_by` varchar(36) NOT NULL,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	`updated_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scoring_template_id`) REFERENCES `scoring_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Exam Sessions table
CREATE TABLE `exam_sessions` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`session_name` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`status` varchar(50) DEFAULT 'scheduled',
	`target_type` varchar(50) NOT NULL,
	`target_ids` text NOT NULL,
	`generated_questions` text,
	`created_by` varchar(36) NOT NULL,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`template_id`) REFERENCES `exam_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Question Pools table
CREATE TABLE `question_pools` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`student_id` varchar(36) NOT NULL,
	`selected_questions` text NOT NULL,
	`question_order` text NOT NULL,
	`generated_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Legacy Exams table
CREATE TABLE `exams` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`session_id` varchar(36),
	`start_time` integer,
	`end_time` integer,
	`duration_minutes` integer NOT NULL,
	`min_duration_minutes` integer DEFAULT 0,
	`randomize_questions` integer DEFAULT false,
	`randomize_answers` integer DEFAULT false,
	`enable_lockdown` integer DEFAULT true,
	`require_token` integer DEFAULT false,
	`max_violations` integer DEFAULT 3,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Legacy Questions table
CREATE TABLE `questions` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`exam_id` varchar(36) NOT NULL,
	`bank_question_id` varchar(36),
	`type` varchar(50) NOT NULL,
	`content` text NOT NULL,
	`answer_key` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`points` integer DEFAULT 1,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bank_question_id`) REFERENCES `bank_questions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Submissions table
CREATE TABLE `submissions` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`exam_id` varchar(36),
	`user_id` varchar(36) NOT NULL,
	`session_id` varchar(36),
	`score` integer DEFAULT 0,
	`total_points` integer,
	`earned_points` integer,
	`start_time` integer DEFAULT (UNIX_TIMESTAMP()),
	`end_time` integer,
	`question_order` text,
	`flagged_questions` text,
	`violation_count` integer DEFAULT 0,
	`violation_log` text,
	`status` varchar(50) DEFAULT 'in_progress',
	`grading_status` varchar(50) DEFAULT 'auto',
	`created_at` integer,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Answers table
CREATE TABLE `answers` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`question_id` varchar(36),
	`bank_question_id` varchar(36),
	`student_answer` text,
	`is_flagged` integer DEFAULT false,
	`is_correct` integer,
	`score` integer DEFAULT 0,
	`max_points` integer,
	`partial_points` integer,
	`grading_status` varchar(50) DEFAULT 'auto',
	`graded_by` varchar(36),
	`graded_at` integer,
	`grading_notes` text,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bank_question_id`) REFERENCES `bank_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Activity Logs table
CREATE TABLE `activity_logs` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`user_id` varchar(36),
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` varchar(36),
	`details` text,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint

-- Exam Tokens table
CREATE TABLE `exam_tokens` (
	`id` varchar(36) PRIMARY KEY NOT NULL,
	`exam_id` varchar(36) NOT NULL,
	`token` text NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_until` integer NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (UNIX_TIMESTAMP()),
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade
);