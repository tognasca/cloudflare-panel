import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as deploymentDb from "../deployment-db";
import * as YAML from "yaml";
import fs from "fs";
import { spawn } from "child_process";

// ==========================
// SCHEMAS
// ==========================
const YamlSiteSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  port: z.number(),
  docker: z.boolean().default(false),
  domain: z.string(),
  deploymentMethod: z.string().default("tunnel"),
});

const YamlConfigSchema = z.object({
  sites: z.array(YamlSiteSchema),
});

// ==========================
// HELPERS
// ==========================

// 🔥 CONVERTE QUALQUER YAML → sites
function parseYamlToSites(yamlContent: string) {
  const parsed: any = YAML.parse(yamlContent);

  // formato padrão
  if (parsed.sites) {
    return parsed.sites;
  }

  // formato cloudflare tunnel
  if (parsed.ingress) {
    return parsed.ingress
      .filter((r: any) => r.hostname && r.service?.startsWith("http"))
      .map((r: any) => {
        const port = Number(r.service.split(":").pop());

        return {
          name: r.hostname.split(".")[0],
          type: r.service.includes("3000") ? "react" : "node",
          port,
          docker: false,
          domain: r.hostname,
          deploymentMethod: "tunnel",
        };
      });
  }

  throw new Error("YAML inválido: formato não suportado");
}

// 🔥 GERA tunnel.yml AUTOMATICAMENTE
function generateTunnelYaml(sites: any[]) {
  return {
    tunnel: process.env.TUNNEL_ID,
    "credentials-file": process.env.TUNNEL_CREDENTIALS,
    ingress: [
      ...sites.map((s) => ({
        hostname: s.domain,
        service: `http://localhost:${s.port}`,
      })),
      { service: "http_status:404" },
    ],
  };
}

// 🔥 EXECUTA CLOUDFLARED COM LOGS
function runTunnel(deploymentId: number) {
  const process = spawn("C:\\cloudflared\\cloudflared.exe", [
    "tunnel",
    "--protocol",
    "http2",
    "run",
    process.env.TUNNEL_ID!,
  ]);

  process.stdout.on("data", async (data) => {
    await deploymentDb.saveDeploymentLog({
      deploymentId,
      level: "info",
      message: data.toString(),
    });
  });

  process.stderr.on("data", async (data) => {
    await deploymentDb.saveDeploymentLog({
      deploymentId,
      level: "error",
      message: data.toString(),
    });
  });
}

// ==========================
// ROUTER
// ==========================

export const deploymentRouter = router({
  // ==========================
  // UPLOAD YAML
  // ==========================
  uploadYaml: protectedProcedure
    .input(z.object({ yamlContent: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const sites = parseYamlToSites(input.yamlContent);

        // limpa antigos
        const existing = await deploymentDb.getSitesConfig(ctx.user.id);
        for (const site of existing) {
          await deploymentDb.deleteSiteConfig(site.id);
        }

        let count = 0;

        for (const site of sites) {
          await deploymentDb.saveSiteConfig({
            userId: ctx.user.id,
            name: site.name,
            type: site.type,
            port: site.port,
            dockerEnabled: site.docker ? 1 : 0,
            domain: site.domain,
            dockerfile: null,
            buildCommand: null,
            startCommand: null,
            status: "stopped",
            deploymentMethod: site.deploymentMethod || "tunnel",
          });
          count++;
        }

        return { success: true, count };
      } catch (err) {
        throw new Error(`Erro YAML: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),

  // ==========================
  // LISTAR SITES
  // ==========================
  listSites: protectedProcedure.query(async ({ ctx }) => {
    const sites = await deploymentDb.getSitesConfig(ctx.user.id);
    return sites.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      port: s.port,
      domain: s.domain,
      status: s.status,
      deploymentMethod: s.deploymentMethod,
      dockerEnabled: s.dockerEnabled === 1,
    }));
  }),

  // ==========================
  // DEPLOY TUNNEL REAL
  // ==========================
  deployToTunnel: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sites = await deploymentDb.getSitesConfig(ctx.user.id);

      const deploymentResult = await deploymentDb.saveDeployment({
        userId: ctx.user.id,
        siteId: input.siteId,
        status: "in_progress",
        deploymentMethod: "tunnel",
      });

      const deploymentId = (deploymentResult as any).insertId || 1;

      try {
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: "Gerando tunnel.yml...",
        });

        const yamlObj = generateTunnelYaml(sites);
        const yamlStr = YAML.stringify(yamlObj);

        fs.writeFileSync("tunnel.yml", yamlStr);

        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: "Iniciando cloudflared...",
        });

        runTunnel(deploymentId);

        await deploymentDb.updateDeployment(deploymentId, {
          status: "success",
          tunnelUrl: "http://localhost",
          completedAt: new Date(),
        });

        return {
          success: true,
          tunnelUrl: "Tunnel ativo",
          deploymentId,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        await deploymentDb.updateDeployment(deploymentId, {
          status: "error",
          errorMessage: errorMsg,
          completedAt: new Date(),
        });

        throw err;
      }
    }),

  startSite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deploymentDb.updateSiteConfig(input.siteId, {
        status: "running",
      });

      return { success: true };
    }),

  stopSite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deploymentDb.updateSiteConfig(input.siteId, {
        status: "stopped",
      });

      return { success: true };
    }),
  getDeploymentLogs: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .query(async ({ input }) => {
      const logs = await deploymentDb.getDeploymentLogs(input.deploymentId);

      return logs.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        createdAt: log.createdAt,
      }));
    }),


});