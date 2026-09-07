CREATE TABLE IF NOT EXISTS `care_files` (
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `care_workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL
);
