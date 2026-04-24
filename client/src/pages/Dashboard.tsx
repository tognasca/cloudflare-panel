import { trpc } from "@/lib/trpc";
import { Globe, Server, Shield, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div
      className="cad-frame p-5 relative"
      style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
    >
      <div className="font-display text-xs tracking-widest mb-2" style={{ color: color || "oklch(0.72 0.18 210)" }}>
        {label}
      </div>
      <div className="font-display text-3xl font-bold" style={{ color: color || "oklch(0.90 0.10 210)" }}>
        {value}
      </div>
      {sub && <div className="font-mono-tech text-xs mt-1" style={{ color: "oklch(0.55 0.06 230)" }}>{sub}</div>}
    </div>
  );
}

function ZoneRow({ zone, onNavigate }: { zone: { id: string; name: string; status: string; paused: boolean; plan?: { name: string }; name_servers?: string[] }; onNavigate: () => void }) {
  const isActive = !zone.paused && zone.status === "active";
  const isPaused = zone.paused;

  return (
    <tr
      className="cursor-pointer transition-all"
      onClick={onNavigate}
    >
      <td>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: isActive ? "oklch(0.70 0.18 145)" : isPaused ? "oklch(0.80 0.18 75)" : "oklch(0.60 0.22 25)" }}
          />
          <span className="font-mono-tech text-sm">{zone.name}</span>
        </div>
      </td>
      <td>
        <span
          className="font-mono-tech text-xs px-2 py-1"
          style={{
            background: isActive ? "oklch(0.70 0.18 145 / 0.15)" : isPaused ? "oklch(0.80 0.18 75 / 0.15)" : "oklch(0.60 0.22 25 / 0.15)",
            border: `1px solid ${isActive ? "oklch(0.70 0.18 145 / 0.4)" : isPaused ? "oklch(0.80 0.18 75 / 0.4)" : "oklch(0.60 0.22 25 / 0.4)"}`,
            color: isActive ? "oklch(0.70 0.18 145)" : isPaused ? "oklch(0.80 0.18 75)" : "oklch(0.60 0.22 25)",
          }}
        >
          {isPaused ? "PAUSADO" : zone.status.toUpperCase()}
        </span>
      </td>
      <td>
        <span className="font-mono-tech text-xs text-muted-foreground">{zone.plan?.name || "—"}</span>
      </td>
      <td>
        <span className="font-mono-tech text-xs text-muted-foreground truncate max-w-xs block">
          {zone.id}
        </span>
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const zonesQuery = trpc.cloudflare.listZones.useQuery(undefined, { retry: false });

  const zones = (zonesQuery.data as Array<{ id: string; name: string; status: string; paused: boolean; plan?: { name: string }; name_servers?: string[] }>) || [];
  const activeZones = zones.filter(z => !z.paused && z.status === "active").length;
  const pausedZones = zones.filter(z => z.paused).length;

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8" style={{ background: "oklch(0.72 0.18 210)" }} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-widest text-glow">DASHBOARD</h1>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              CLOUDFLARE DNS MANAGEMENT // DOMÍNIO: ademartognasca.com.br
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-px flex-1" style={{ background: "oklch(0.28 0.10 240)" }} />
          <span className="font-mono-tech text-xs text-muted-foreground opacity-50">
            {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
          </span>
          <div className="h-px flex-1" style={{ background: "oklch(0.28 0.10 240)" }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="TOTAL ZONAS" value={zones.length} sub="zonas registradas" />
        <StatCard label="ATIVAS" value={activeZones} sub="em operação" color="oklch(0.70 0.18 145)" />
        <StatCard label="PAUSADAS" value={pausedZones} sub="suspensas" color="oklch(0.80 0.18 75)" />
        <StatCard label="SISTEMA" value="ONLINE" sub="API conectada" color="oklch(0.72 0.18 210)" />
      </div>

      {/* Zones table */}
      <div
        className="cad-frame"
        style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "oklch(0.28 0.10 240)" }}>
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-primary" />
            <span className="font-display text-sm font-bold tracking-wider">ZONAS DNS</span>
          </div>
          <button
            onClick={() => zonesQuery.refetch()}
            className="flex items-center gap-2 px-3 py-1 font-mono-tech text-xs transition-all hover:text-primary"
            style={{ border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.55 0.06 230)" }}
          >
            <RefreshCw size={12} className={zonesQuery.isFetching ? "animate-spin" : ""} />
            ATUALIZAR
          </button>
        </div>

        {zonesQuery.isLoading && (
          <div className="p-8 text-center">
            <div className="font-mono-tech text-sm text-muted-foreground">
              CARREGANDO ZONAS<span className="cursor-blink">_</span>
            </div>
          </div>
        )}

        {zonesQuery.error && (
          <div className="p-6">
            <div
              className="flex items-center gap-3 p-4"
              style={{ background: "oklch(0.60 0.22 25 / 0.1)", border: "1px solid oklch(0.60 0.22 25 / 0.3)" }}
            >
              <AlertTriangle size={16} style={{ color: "oklch(0.60 0.22 25)" }} />
              <div>
                <div className="font-display text-xs font-bold tracking-wider" style={{ color: "oklch(0.60 0.22 25)" }}>
                  ERRO DE CONEXÃO
                </div>
                <div className="font-mono-tech text-xs mt-1 text-muted-foreground">
                  {zonesQuery.error.message}
                </div>
                {zonesQuery.error.message.includes("Token") && (
                  <button
                    onClick={() => navigate("/settings")}
                    className="font-mono-tech text-xs mt-2 underline"
                    style={{ color: "oklch(0.72 0.18 210)" }}
                  >
                    → Configurar token da API
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!zonesQuery.isLoading && !zonesQuery.error && zones.length === 0 && (
          <div className="p-8 text-center">
            <Globe size={32} className="mx-auto mb-3 text-muted-foreground opacity-30" />
            <div className="font-mono-tech text-sm text-muted-foreground">NENHUMA ZONA ENCONTRADA</div>
          </div>
        )}

        {zones.length > 0 && (
          <div className="overflow-x-auto">
            <table className="tech-table w-full">
              <thead>
                <tr>
                  <th>ZONA</th>
                  <th>STATUS</th>
                  <th>PLANO</th>
                  <th>ZONE ID</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <ZoneRow key={zone.id} zone={zone} onNavigate={() => navigate("/services")} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { label: "GERENCIAR DNS", desc: "Criar, editar e deletar registros", path: "/dns", icon: Globe },
          { label: "CONTROLE DE SERVIÇOS", desc: "Subir e pausar zonas", path: "/services", icon: Server },
          { label: "TERMINAL CLI", desc: "Executar comandos diretos", path: "/terminal", icon: Shield },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="p-4 text-left transition-all duration-150 hover:glow-blue group"
              style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-primary" />
                <span className="font-display text-xs font-bold tracking-wider group-hover:text-glow">{action.label}</span>
              </div>
              <p className="font-mono-tech text-xs text-muted-foreground opacity-60">{action.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
