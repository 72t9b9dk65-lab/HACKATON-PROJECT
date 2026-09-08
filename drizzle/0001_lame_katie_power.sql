CREATE TABLE `care_oauth_flows` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`browser_hash` text NOT NULL,
	`provider` text NOT NULL,
	`origin` text NOT NULL,
	`nonce` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `care_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`origin` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `care_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `care_users` (
	`id` text PRIMARY KEY NOT NULL,
	`identity_key` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_users_identity_key_unique` ON `care_users` (`identity_key`);