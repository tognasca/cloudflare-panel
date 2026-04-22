import { eq, and } from "drizzle-orm";
import { sitesConfig, deployments, deploymentLogs, InsertSitesConfig, InsertDeployments, InsertDeploymentLogs } from "../drizzle/schema";
import { getDb } from "./db";

export async function getSitesConfig(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sitesConfig).where(eq(sitesConfig.userId, userId));
}

export async function getSiteConfigById(userId: number, siteId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(sitesConfig).where(and(eq(sitesConfig.userId, userId), eq(sitesConfig.id, siteId))).limit(1);
  return result[0] || null;
}

export async function saveSiteConfig(config: InsertSitesConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sitesConfig).values(config);
  return result;
}

export async function updateSiteConfig(siteId: number, updates: Partial<InsertSitesConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(sitesConfig).set(updates).where(eq(sitesConfig.id, siteId));
}

export async function deleteSiteConfig(siteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(sitesConfig).where(eq(sitesConfig.id, siteId));
}

export async function getDeployments(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deployments).where(eq(deployments.userId, userId)).limit(limit);
}

export async function saveDeployment(deployment: InsertDeployments) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deployments).values(deployment);
  return result;
}

export async function updateDeployment(deploymentId: number, updates: Partial<InsertDeployments>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(deployments).set(updates).where(eq(deployments.id, deploymentId));
}

export async function saveDeploymentLog(log: InsertDeploymentLogs) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(deploymentLogs).values(log);
}

export async function getDeploymentLogs(deploymentId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deploymentLogs).where(eq(deploymentLogs.deploymentId, deploymentId)).limit(limit);
}
