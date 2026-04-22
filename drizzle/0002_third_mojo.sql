CREATE TABLE `deployment_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deploymentId` int NOT NULL,
	`level` enum('info','warn','error','success') NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deployment_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`siteId` int NOT NULL,
	`status` enum('pending','in_progress','success','error') NOT NULL DEFAULT 'pending',
	`deploymentMethod` enum('tunnel','pages','workers') NOT NULL,
	`tunnelUrl` varchar(255),
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('react','angular','mvc','static','node','python') NOT NULL,
	`port` int NOT NULL,
	`dockerEnabled` int NOT NULL DEFAULT 1,
	`domain` varchar(255) NOT NULL,
	`dockerImage` varchar(255),
	`dockerfile` text,
	`buildCommand` varchar(255),
	`startCommand` varchar(255),
	`status` enum('stopped','running','error') NOT NULL DEFAULT 'stopped',
	`deploymentMethod` enum('tunnel','pages','workers') NOT NULL DEFAULT 'tunnel',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_config_id` PRIMARY KEY(`id`)
);
