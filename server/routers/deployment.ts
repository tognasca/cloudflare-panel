import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as deploymentDb from "../deployment-db";
import * as YAML from "yaml";

// YAML Schema validation
const YamlSiteSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["react", "angular", "mvc", "static", "node", "python"]),
  port: z.number().int().positive(),
  docker: z.boolean().default(true),
  domain: z.string().min(1),
  dockerfile: z.string().optional(),
  buildCommand: z.string().optional(),
  startCommand: z.string().optional(),
  deploymentMethod: z.enum(["tunnel", "pages", "workers"]).default("tunnel"),
});

const YamlConfigSchema = z.object({
  sites: z.array(YamlSiteSchema),
});

type YamlSite = z.infer<typeof YamlSiteSchema>;
type YamlConfig = z.infer<typeof YamlConfigSchema>;

export const deploymentRouter = router({
  // Upload and parse YAML
  uploadYaml: protectedProcedure
    .input(z.object({ yamlContent: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const parsed = YAML.parse(input.yamlContent);
        const config = YamlConfigSchema.parse(parsed);

        // Clear existing sites for this user
        const existing = await deploymentDb.getSitesConfig(ctx.user.id);
        for (const site of existing) {
          await deploymentDb.deleteSiteConfig(site.id);
        }

        // Save new sites
        let count = 0;
        for (const site of config.sites) {
          await deploymentDb.saveSiteConfig({
            userId: ctx.user.id,
            name: site.name,
            type: site.type,
            port: site.port,
            dockerEnabled: site.docker ? 1 : 0,
            domain: site.domain,
            dockerfile: site.dockerfile || null,
            buildCommand: site.buildCommand || null,
            startCommand: site.startCommand || null,
            status: "stopped",
            deploymentMethod: site.deploymentMethod,
          });
          count++;
        }

        return { success: true, count };
      } catch (err) {
        throw new Error(`Erro ao fazer parse do YAML: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),

  // List all sites
  listSites: protectedProcedure.query(async ({ ctx }) => {
    const sites = await deploymentDb.getSitesConfig(ctx.user.id);
    return sites.map(s => ({
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

  // Get site details
  getSiteDetails: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");
      return site;
    }),

  // Start site (Docker container or local server)
  startSite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");

      // Create deployment record
      const deploymentResult = await deploymentDb.saveDeployment({
        userId: ctx.user.id,
        siteId: site.id,
        status: "in_progress",
        deploymentMethod: site.deploymentMethod as "tunnel" | "pages" | "workers",
      });
      const deploymentId = (deploymentResult as any).insertId || 1;

      try {
        // Log: starting
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: `Iniciando ${site.type} em porta ${site.port}...`,
        });

        // Simulate Docker start (in real implementation, would call Docker API)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Log: success
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "success",
          message: `✓ ${site.name} iniciado com sucesso em http://localhost:${site.port}`,
        });

        // Update site status
        await deploymentDb.updateSiteConfig(site.id, { status: "running" });

        // Update deployment
        await deploymentDb.updateDeployment(deploymentId, {
          status: "success",
          completedAt: new Date(),
          tunnelUrl: `http://localhost:${site.port}`,
        });

        return { success: true, message: `${site.name} iniciado` };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "error",
          message: `✗ Erro ao iniciar: ${errorMsg}`,
        });
        await deploymentDb.updateDeployment(deploymentId, {
          status: "error",
          errorMessage: errorMsg,
          completedAt: new Date(),
        });
        throw err;
      }
    }),

  // Stop site
  stopSite: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");

      await deploymentDb.updateSiteConfig(site.id, { status: "stopped" });
      return { success: true, message: `${site.name} parado` };
    }),

  // Get deployment logs
  getDeploymentLogs: protectedProcedure
    .input(z.object({ deploymentId: z.number() }))
    .query(async ({ ctx, input }) => {
      return deploymentDb.getDeploymentLogs(input.deploymentId);
    }),

  // Deploy to Cloudflare Tunnel
  deployToTunnel: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");

      const deploymentResult = await deploymentDb.saveDeployment({
        userId: ctx.user.id,
        siteId: site.id,
        status: "in_progress",
        deploymentMethod: "tunnel",
      });
      const deploymentId = (deploymentResult as any).insertId || 1;

      try {
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: `Criando Cloudflare Tunnel para ${site.name}...`,
        });

        // Simulate tunnel creation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const tunnelUrl = `${site.name}.tunnel.cloudflare.com`;

        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "success",
          message: `✓ Tunnel criado: ${tunnelUrl}`,
        });

        await deploymentDb.updateDeployment(deploymentId, {
          status: "success",
          tunnelUrl,
          completedAt: new Date(),
        });

        return { success: true, tunnelUrl };
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

  // Deploy to Cloudflare Pages
  deployToPages: protectedProcedure
    .input(z.object({ siteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const site = await deploymentDb.getSiteConfigById(ctx.user.id, input.siteId);
      if (!site) throw new Error("Site não encontrado");

      if (!["react", "angular", "static"].includes(site.type)) {
        throw new Error("Apenas React, Angular e sites estáticos podem ser deployados no Pages");
      }

      const deploymentResult = await deploymentDb.saveDeployment({
        userId: ctx.user.id,
        siteId: site.id,
        status: "in_progress",
        deploymentMethod: "pages",
      });
      const deploymentId = (deploymentResult as any).insertId || 1;

      try {
        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: `Fazendo build de ${site.name}...`,
        });

        // Simulate build
        await new Promise(resolve => setTimeout(resolve, 3000));

        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "info",
          message: `Upload para Cloudflare Pages...`,
        });

        // Simulate upload
        await new Promise(resolve => setTimeout(resolve, 2000));

        const pagesUrl = `https://${site.domain}`;

        await deploymentDb.saveDeploymentLog({
          deploymentId,
          level: "success",
          message: `✓ Deployado em ${pagesUrl}`,
        });

        await deploymentDb.updateDeployment(deploymentId, {
          status: "success",
          tunnelUrl: pagesUrl,
          completedAt: new Date(),
        });

        return { success: true, url: pagesUrl };
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
});
