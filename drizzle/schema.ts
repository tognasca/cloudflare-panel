import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Cloudflare settings per user
export const cfSettings = mysqlTable("cf_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  apiToken: text("apiToken"),
  accountId: varchar("accountId", { length: 64 }),
  baseDomain: varchar("baseDomain", { length: 255 }).default("Ademar.tognasca.com.br"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CfSettings = typeof cfSettings.$inferSelect;
export type InsertCfSettings = typeof cfSettings.$inferInsert;

// Terminal command history
export const commandHistory = mysqlTable("command_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  command: text("command").notNull(),
  output: text("output"),
  status: mysqlEnum("status", ["success", "error", "running"]).default("running").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommandHistory = typeof commandHistory.$inferSelect;
export type InsertCommandHistory = typeof commandHistory.$inferInsert;

// Sites configuration from YAML
export const sitesConfig = mysqlTable("sites_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["react", "angular", "mvc", "static", "node", "python"]).notNull(),
  port: int("port").notNull(),
  dockerEnabled: int("dockerEnabled").default(1).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  dockerImage: varchar("dockerImage", { length: 255 }),
  dockerfile: text("dockerfile"),
  buildCommand: varchar("buildCommand", { length: 255 }),
  startCommand: varchar("startCommand", { length: 255 }),
  status: mysqlEnum("status", ["stopped", "running", "error"]).default("stopped").notNull(),
  deploymentMethod: mysqlEnum("deploymentMethod", ["tunnel", "pages", "workers"]).default("tunnel").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SitesConfig = typeof sitesConfig.$inferSelect;
export type InsertSitesConfig = typeof sitesConfig.$inferInsert;

// Deployment history
export const deployments = mysqlTable("deployments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  siteId: int("siteId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "success", "error"]).default("pending").notNull(),
  deploymentMethod: mysqlEnum("deploymentMethod", ["tunnel", "pages", "workers"]).notNull(),
  tunnelUrl: varchar("tunnelUrl", { length: 255 }),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Deployments = typeof deployments.$inferSelect;
export type InsertDeployments = typeof deployments.$inferInsert;

// Deployment logs
export const deploymentLogs = mysqlTable("deployment_logs", {
  id: int("id").autoincrement().primaryKey(),
  deploymentId: int("deploymentId").notNull(),
  level: mysqlEnum("level", ["info", "warn", "error", "success"]).default("info").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeploymentLogs = typeof deploymentLogs.$inferSelect;
export type InsertDeploymentLogs = typeof deploymentLogs.$inferInsert;
