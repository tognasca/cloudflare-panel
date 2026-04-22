import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getCfSettings, saveCfSettings, saveCommandHistory, updateCommandHistory, getCommandHistory } from "../db";

const CF_API = "https://api.cloudflare.com/client/v4";

async function cfFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json() as { success: boolean; result: unknown; errors: { message: string }[] };
  if (!data.success) {
    const msg = data.errors?.map((e: { message: string }) => e.message).join(", ") || "Cloudflare API error";
    throw new Error(msg);
  }
  return data.result;
}

export const cloudflareRouter = router({
  // Settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getCfSettings(ctx.user.id);
    return settings ? { ...settings, apiToken: settings.apiToken ? "••••••••" + settings.apiToken.slice(-4) : null } : null;
  }),

  saveSettings: protectedProcedure
    .input(z.object({
      apiToken: z.string().min(1, "Token obrigatório"),
      accountId: z.string().optional(),
      baseDomain: z.string().default("Ademar.tognasca.com.br"),
    }))
    .mutation(async ({ ctx, input }) => {
      let tokenToSave = input.apiToken;
      if (input.apiToken === "__KEEP__") {
        const existing = await getCfSettings(ctx.user.id);
        tokenToSave = existing?.apiToken || "";
      }
      await saveCfSettings({
        userId: ctx.user.id,
        apiToken: tokenToSave,
        accountId: input.accountId || null,
        baseDomain: input.baseDomain,
      });
      return { success: true };
    }),

  hasToken: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getCfSettings(ctx.user.id);
    return { hasToken: !!(settings?.apiToken) };
  }),

  // Zones
  listZones: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getCfSettings(ctx.user.id);
    if (!settings?.apiToken) throw new Error("Token da API não configurado. Acesse Configurações.");
    const result = await cfFetch(settings.apiToken, "/zones") as Array<{
      id: string; name: string; status: string; paused: boolean;
      name_servers: string[]; original_name_servers: string[];
      created_on: string; modified_on: string;
      plan: { name: string }; type: string;
    }>;
    return result;
  }),

  getZoneDetails: protectedProcedure
    .input(z.object({ zoneId: z.string() }))
    .query(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      return cfFetch(settings.apiToken, `/zones/${input.zoneId}`);
    }),

  pauseZone: protectedProcedure
    .input(z.object({ zoneId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      return cfFetch(settings.apiToken, `/zones/${input.zoneId}/pause`, { method: "POST" });
    }),

  unpauseZone: protectedProcedure
    .input(z.object({ zoneId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      return cfFetch(settings.apiToken, `/zones/${input.zoneId}/unpause`, { method: "POST" });
    }),

  // DNS Records
  listDnsRecords: protectedProcedure
    .input(z.object({ zoneId: z.string() }))
    .query(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      const result = await cfFetch(settings.apiToken, `/zones/${input.zoneId}/dns_records?per_page=100`) as Array<{
        id: string; type: string; name: string; content: string;
        ttl: number; proxied: boolean; priority?: number;
        created_on: string; modified_on: string;
      }>;
      return result;
    }),

  createDnsRecord: protectedProcedure
    .input(z.object({
      zoneId: z.string(),
      type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"]),
      name: z.string().min(1),
      content: z.string().min(1),
      ttl: z.number().default(1),
      proxied: z.boolean().default(false),
      priority: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      const { zoneId, ...record } = input;
      return cfFetch(settings.apiToken, `/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: JSON.stringify(record),
      });
    }),

  updateDnsRecord: protectedProcedure
    .input(z.object({
      zoneId: z.string(),
      recordId: z.string(),
      type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"]),
      name: z.string().min(1),
      content: z.string().min(1),
      ttl: z.number().default(1),
      proxied: z.boolean().default(false),
      priority: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      const { zoneId, recordId, ...record } = input;
      return cfFetch(settings.apiToken, `/zones/${zoneId}/dns_records/${recordId}`, {
        method: "PUT",
        body: JSON.stringify(record),
      });
    }),

  deleteDnsRecord: protectedProcedure
    .input(z.object({ zoneId: z.string(), recordId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado.");
      return cfFetch(settings.apiToken, `/zones/${input.zoneId}/dns_records/${input.recordId}`, { method: "DELETE" });
    }),

  // Terminal
  executeCommand: protectedProcedure
    .input(z.object({ command: z.string().min(1), defaultZoneId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const settings = await getCfSettings(ctx.user.id);
      if (!settings?.apiToken) throw new Error("Token da API não configurado. Acesse Configurações.");

      const cmd = input.command.trim().toLowerCase();
      const parts = cmd.split(/\s+/);
      const action = parts[0];
      const defaultZone = input.defaultZoneId;
      const zoneInfo = defaultZone ? ` (zona: ${defaultZone.slice(0, 8)}...)` : "";

      let output = "";
      let status: "success" | "error" = "success";

      try {
        if (action === "help") {
          output = `Comandos disponíveis${zoneInfo}:
  zones list                     - Listar todas as zonas
  zone pause [zone_id]           - Pausar zona (usa padrão se omitido)
  zone unpause [zone_id]         - Ativar zona (usa padrão se omitido)
  zone info [zone_id]            - Detalhes da zona (usa padrão se omitido)
  dns list [zone_id]             - Listar registros DNS (usa padrão se omitido)
  dns create [zone_id] <type> <name> <content> [ttl] [proxied]
                                 - Criar registro DNS (usa padrão se omitido)
  dns delete [zone_id] <record_id>
                                 - Deletar registro DNS (usa padrão se omitido)
  clear                          - Limpar terminal
  help                           - Exibir esta ajuda`;
        } else if (action === "zones" && parts[1] === "list") {
          const zones = await cfFetch(settings.apiToken, "/zones") as Array<{ id: string; name: string; status: string; paused: boolean }>;
          output = zones.map(z => `[${z.paused ? "PAUSADO" : z.status.toUpperCase()}] ${z.name} (${z.id})`).join("\n");
          if (!output) output = "Nenhuma zona encontrada.";
        } else if (action === "zone" && parts[1] === "pause") {
          const zoneId = parts[2] || defaultZone;
          if (!zoneId) throw new Error("Zone ID obrigatório ou selecione uma zona padrão.");
          await cfFetch(settings.apiToken, `/zones/${zoneId}/pause`, { method: "POST" });
          output = `✓ Zona pausada com sucesso.`;
        } else if (action === "zone" && parts[1] === "unpause") {
          const zoneId = parts[2] || defaultZone;
          if (!zoneId) throw new Error("Zone ID obrigatório ou selecione uma zona padrão.");
          await cfFetch(settings.apiToken, `/zones/${zoneId}/unpause`, { method: "POST" });
          output = `✓ Zona ativada com sucesso.`;
        } else if (action === "zone" && parts[1] === "info") {
          const zoneId = parts[2] || defaultZone;
          if (!zoneId) throw new Error("Zone ID obrigatório ou selecione uma zona padrão.");
          const zone = await cfFetch(settings.apiToken, `/zones/${zoneId}`) as { id: string; name: string; status: string; paused: boolean; name_servers: string[]; plan: { name: string } };
          output = `Zona: ${zone.name}\nID: ${zone.id}\nStatus: ${zone.status}\nPausado: ${zone.paused}\nPlano: ${zone.plan?.name}\nName Servers: ${zone.name_servers?.join(", ")}`;
        } else if (action === "dns" && parts[1] === "list") {
          const zoneId = parts[2] || defaultZone;
          if (!zoneId) throw new Error("Zone ID obrigatório ou selecione uma zona padrão.");
          const records = await cfFetch(settings.apiToken, `/zones/${zoneId}/dns_records?per_page=100`) as Array<{ type: string; name: string; content: string; ttl: number; proxied: boolean }>;
          output = records.map(r => `${r.type.padEnd(6)} ${r.name.padEnd(40)} ${r.content} TTL:${r.ttl} Proxy:${r.proxied}`).join("\n");
          if (!output) output = "Nenhum registro DNS encontrado.";
        } else if (action === "dns" && parts[1] === "create") {
          // Detectar se o segundo argumento é zone_id ou type
          const isZoneId = parts[2] && /^[a-z0-9]{32}$/i.test(parts[2]);
          const zoneId = isZoneId ? parts[2] : defaultZone;
          const typeIdx = isZoneId ? 3 : 2;
          if (!zoneId) throw new Error("Zone ID obrigatório ou selecione uma zona padrão.");
          if (parts.length < typeIdx + 3) throw new Error("Sintaxe: dns create [zone_id] <type> <name> <content> [ttl] [proxied]");
          const [type, name, content, ttlStr, proxiedStr] = [parts[typeIdx], parts[typeIdx + 1], parts[typeIdx + 2], parts[typeIdx + 3], parts[typeIdx + 4]];
          const body = { type: type.toUpperCase(), name, content, ttl: parseInt(ttlStr || "1"), proxied: proxiedStr === "true" };
          await cfFetch(settings.apiToken, `/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify(body) });
          output = `✓ Registro DNS criado: ${type.toUpperCase()} ${name} → ${content}`;
        } else if (action === "dns" && parts[1] === "delete") {
          // Detectar se o segundo argumento é zone_id ou record_id
          const isZoneId = parts[2] && /^[a-z0-9]{32}$/i.test(parts[2]);
          const zoneId = isZoneId ? parts[2] : defaultZone;
          const recordIdIdx = isZoneId ? 3 : 2;
          if (!zoneId) throw new Error("Zone ID obrigatório ou selecione uma zona padrão.");
          if (!parts[recordIdIdx]) throw new Error("Record ID obrigatório.");
          await cfFetch(settings.apiToken, `/zones/${zoneId}/dns_records/${parts[recordIdIdx]}`, { method: "DELETE" });
          output = `✓ Registro deletado com sucesso.`;
        } else if (action === "clear") {
          output = "__CLEAR__";
        } else {
          output = `Comando não reconhecido: "${input.command}"\nDigite "help" para ver os comandos disponíveis.`;
          status = "error";
        }
      } catch (err) {
        output = `Erro: ${err instanceof Error ? err.message : String(err)}`;
        status = "error";
      }

      // Save to history
      await saveCommandHistory({ userId: ctx.user.id, command: input.command, output, status });

      return { output, status };
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return getCommandHistory(ctx.user.id, 100);
  }),
});
