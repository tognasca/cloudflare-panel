import { eq, and, desc } from "drizzle-orm";
import { sitesConfig, deployments, deploymentLogs, type InsertSitesConfig, type InsertDeployments, type InsertDeploymentLogs } from "../drizzle/schema";
import { getDb } from "./db";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db;
}

export async function getSitesConfig(userId: number) {
  return (await database()).select().from(sitesConfig).where(eq(sitesConfig.userId, String(userId)));
}

export async function getSiteConfigById(userId: number, siteId: number) {
  const rows = await (await database()).select().from(sitesConfig)
    .where(and(eq(sitesConfig.userId, String(userId)), eq(sitesConfig.id, siteId))).limit(1);
  return rows[0] ?? null;
}

export async function saveSiteConfig(config: InsertSitesConfig) {
  return (await database()).insert(sitesConfig).values(config).returning();
}

export async function updateSiteConfig(siteId: number, updates: Partial<InsertSitesConfig>) {
  return (await database()).update(sitesConfig).set(updates).where(eq(sitesConfig.id, siteId));
}

export async function deleteSiteConfig(siteId: number) {
  return (await database()).delete(sitesConfig).where(eq(sitesConfig.id, siteId));
}

export async function getDeployments(userId: number, limit = 50) {
  return (await database()).select().from(deployments)
    .where(eq(deployments.userId, String(userId))).orderBy(desc(deployments.startedAt)).limit(limit);
}

export async function saveDeployment(deployment: InsertDeployments) {
  const rows = await (await database()).insert(deployments).values(deployment).returning();
  return rows[0];
}

export async function updateDeployment(deploymentId: number, updates: Partial<InsertDeployments>) {
  return (await database()).update(deployments).set(updates).where(eq(deployments.id, deploymentId));
}

export async function saveDeploymentLog(log: InsertDeploymentLogs) {
  return (await database()).insert(deploymentLogs).values(log);
}

export async function getDeploymentLogs(deploymentId: number, limit = 100) {
  return (await database()).select().from(deploymentLogs)
    .where(eq(deploymentLogs.deploymentId, deploymentId)).orderBy(desc(deploymentLogs.createdAt)).limit(limit);
}
