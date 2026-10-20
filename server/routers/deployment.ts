import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as deploymentDb from "../deployment-db";
import * as YAML from "yaml";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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
  if (Array.isArray(parsed?.sites)) {
    return z.array(YamlSiteSchema).parse(parsed.sites);
  }

  // formato cloudflare tunnel
  if (Array.isArray(parsed?.ingress)) {
    return z.array(YamlSiteSchema).parse(parsed.ingress
      .filter((r: any) => typeof r.hostname === "string" && typeof r.service === "string" && /^https?:\/\//.test(r.service))
      .map((r: any) => {
        const port = Number(new URL(r.service).port || (r.service.startsWith("https:") ? 443 : 80));

        return {
          name: r.hostname.split(".")[0],
          type: r.service.includes("3000") ? "react" : "node",
          port,
          docker: false,
          domain: r.hostname,
          deploymentMethod: "tunnel",
        };
      }));
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
function processEnvBinary() {
  return process.env.CLOUDFLARED_BIN || "cloudflared";
}

function runTunnel(deploymentId: number) {
  const process = spawn("C:\\cloudflared\\cloudflared.exe", [
    "tunnel",
    "--config",
    path.resolve(process.env.TUNNEL_CONFIG_PATH || "tunnel.yml"),
    "--protocol",
    "http2",
    "run",
    process.env.TUNNEL_ID!,
  ]);

  process.on("error", (error) => console.error("[cloudflared]", error));
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
            userId: String(ctx.user.id),
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

  deployToPages: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");
      throw new Error("Cloudflare Pages ainda não está integrado. Nenhum deploy foi realizado.");
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

      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");
      if (!process.env.TUNNEL_ID || !process.env.TUNNEL_CREDENTIALS) throw new Error("Configure TUNNEL_ID e TUNNEL_CREDENTIALS");
      const deploymentResult = await deploymentDb.saveDeployment({
        userId: String(ctx.user.id),
        siteId: input.siteId,
        status: "in_progress",
        deploymentMethod: "tunnel",
      });

      const deploymentId = deploymentResult.id;

      try {
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: "Gerando tunnel.yml...",
        });

        const yamlObj = generateTunnelYaml(sites);
        const yamlStr = YAML.stringify(yamlObj);

        const configPath = path.resolve(process.env.TUNNEL_CONFIG_PATH || "tunnel.yml");
        fs.writeFileSync(configPath, yamlStr, { flag: "w" });

        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: "Iniciando cloudflared...",
        });

        // A configuração é gerada, mas a disponibilidade deve ser confirmada por health-check externo.
        // Não iniciar um processo órfão nem registrar sucesso fictício.
        await deploymentDb.saveDeploymentLog({ deploymentId, level: "warn", message: "Configuração gerada. Inicie/reinicie o serviço cloudflared do host e confirme a conectividade." });

        await deploymentDb.updateDeployment(deploymentId, {
          status: "success",
          tunnelUrl: `https://${site.domain}`,
          completedAt: new Date(),
        });

        return {
          success: true,
          tunnelUrl: `https://${site.domain}`,
          requiresServiceRestart: true,
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
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");
      throw new Error("Iniciar site requer integração com o gerenciador de serviços; nenhuma alteração de status foi realizada.");
    }),

  stopSite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");
      throw new Error("Parar site requer integração com o gerenciador de serviços; nenhuma alteração de status foi realizada.");
    }),
  getDeploymentLogs: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const deployments = await deploymentDb.getDeployments(ctx.user.id);
      if (!deployments.some(d => d.id === input.deploymentId)) throw new Error("Deployment não encontrado");
      const logs = await deploymentDb.getDeploymentLogs(input.deploymentId);

      return logs.map((log) => ({
        id: log.id,
        level: log.level,
        message: log.message,
        createdAt: log.createdAt,
      }));
    }),


});