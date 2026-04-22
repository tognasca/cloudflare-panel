CREATE TABLE `cf_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiToken` text,
	`accountId` varchar(64),
	`baseDomain` varchar(255) DEFAULT 'Ademar.tognasca.com.br',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cf_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `command_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`command` text NOT NULL,
	`output` text,
	`status` enum('success','error','running') NOT NULL DEFAULT 'running',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `command_history_id` PRIMARY KEY(`id`)
);
