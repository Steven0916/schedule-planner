CREATE TABLE `attendees` (
	`schedule_id` text NOT NULL,
	`person_id` text NOT NULL,
	PRIMARY KEY(`schedule_id`, `person_id`),
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
