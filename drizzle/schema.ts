import { pgEnum, pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["stopped", "running", "error"]);
export const deployStatusEnum = pgEnum("deploy_status", ["pending", "in_progress", "success", "error"]);
export const deployMethodEnum = pgEnum("deploy_method", ["tunnel", "pages", "workers"]);
export const cmdStatusEnum = pgEnum("cmd_status", ["success", "error", "running"]);
export const logLevelEnum = pgEnum("log_level", ["info", "warn", "error", "success"]);
export const siteTypeEnum = pgEnum("site_type", ["react", "angular", "mvc", "static", "node", "python"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const cfSettings = pgTable("cf_settings", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  apiToken: text("apiToken"),
  accountId: varchar("accountId", { length: 64 }),
  baseDomain: varchar("baseDomain", { length: 255 }).default("ademartognasca.com.br"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CfSettings = typeof cfSettings.$inferSelect;
export type InsertCfSettings = typeof cfSettings.$inferInsert;

export const commandHistory = pgTable("command_history", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  command: text("command").notNull(),
  output: text("output"),
  status: cmdStatusEnum("status").default("running").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommandHistory = typeof commandHistory.$inferSelect;
export type InsertCommandHistory = typeof commandHistory.$inferInsert;

export const sitesConfig = pgTable("sites_config", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: siteTypeEnum("type").notNull(),
  port: integer("port").notNull(),
  dockerEnabled: integer("dockerEnabled").default(1).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  dockerImage: varchar("dockerImage", { length: 255 }),
  dockerfile: text("dockerfile"),
  buildCommand: varchar("buildCommand", { length: 255 }),
  startCommand: varchar("startCommand", { length: 255 }),
  status: statusEnum("status").default("stopped").notNull(),
  deploymentMethod: deployMethodEnum("deploymentMethod").default("tunnel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SitesConfig = typeof sitesConfig.$inferSelect;
export type InsertSitesConfig = typeof sitesConfig.$inferInsert;

export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  siteId: integer("siteId").notNull(),
  status: deployStatusEnum("status").default("pending").notNull(),
  deploymentMethod: deployMethodEnum("deploymentMethod").notNull(),
  tunnelUrl: varchar("tunnelUrl", { length: 255 }),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Deployments = typeof deployments.$inferSelect;
export type InsertDeployments = typeof deployments.$inferInsert;

export const deploymentLogs = pgTable("deployment_logs", {
  id: serial("id").primaryKey(),
  deploymentId: integer("deploymentId").notNull(),
  level: logLevelEnum("level").default("info").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeploymentLogs = typeof deploymentLogs.$inferSelect;
export type InsertDeploymentLogs = typeof deploymentLogs.$inferInsert;