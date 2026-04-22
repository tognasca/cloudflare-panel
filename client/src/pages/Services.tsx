import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Server, Play, Pause, RefreshCw, AlertTriangle, CheckCircle, Clock, Globe } from "lucide-react";

type Zone = {
  id: string; name: string; status: string; paused: boolean;
  plan?: { name: string }; name_servers?: string[];
  created_on?: string; modified_on?: string; type?: string;
};

function ZoneCard({ zone, onRefresh }: { zone: Zone; onRefresh: () => void }) {
  const isActive = !zone.paused && zone.status === "active";
  const isPaused = zone.paused;

  const pauseMut = trpc.cloudflare.pauseZone.useMutation({
    onSuccess: () => { toast.success(`Zona ${zone.name} pausada.`); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });
  const unpauseMut = trpc.cloudflare.unpauseZone.useMutation({
    onSuccess: () => { toast.success(`Zona ${zone.name} ativada.`); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = pauseMut.isPending || unpauseMut.isPending;

  const statusColor = isActive ? "oklch(0.70 0.18 145)" : isPaused ? "oklch(0.80 0.18 75)" : "oklch(0.60 0.22 25)";
  const statusLabel = isPaused ? "PAUSADO" : zone.status.toUpperCase();

  return (
    <div
      className="cad-frame p-5 relative"
      style={{ background: "oklch(0.14 0.07 250)", border: `1px solid ${isActive ? "oklch(0.70 0.18 145 / 0.3)" : "oklch(0.28 0.10 240)"}` }}
    >
      {/* Status indicator */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Globe size={20} style={{ color: statusColor }} />
            {isActive && (
              <div
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full pulse-dot"
                style={{ background: "oklch(0.70 0.18 145)" }}
              />
            )}
          </div>
          <div>
            <div className="font-mono-tech text-sm font-bold">{zone.name}</div>
            <div className="font-mono-tech text-xs text-muted-foreground opacity-60 mt-0.5">
              {zone.id.slice(0, 20)}...
            </div>
          </div>
        </div>
        <span
          className="font-mono-tech text-xs px-2 py-1"
          style={{
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}40`,
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <div className="font-display text-xs tracking-widest mb-1" style={{ color: "oklch(0.72 0.18 210)", fontSize: "0.6rem" }}>PLANO</div>
          <div className="font-mono-tech text-xs">{zone.plan?.name || "—"}</div>
        </div>
        <div>
          <div className="font-display text-xs tracking-widest mb-1" style={{ color: "oklch(0.72 0.18 210)", fontSize: "0.6rem" }}>TIPO</div>
          <div className="font-mono-tech text-xs">{zone.type || "full"}</div>
        </div>
        {zone.name_servers && zone.name_servers.length > 0 && (
          <div className="col-span-2">
            <div className="font-display text-xs tracking-widest mb-1" style={{ color: "oklch(0.72 0.18 210)", fontSize: "0.6rem" }}>NAME SERVERS</div>
            <div className="font-mono-tech text-xs text-muted-foreground">
              {zone.name_servers.slice(0, 2).join(" / ")}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px mb-4" style={{ background: "oklch(0.25 0.08 250)" }} />

      {/* Actions */}
      <div className="flex gap-3">
        {isActive ? (
          <button
            onClick={() => {
              if (confirm(`Pausar zona ${zone.name}? O tráfego passará direto ao servidor de origem.`)) {
                pauseMut.mutate({ zoneId: zone.id });
              }
            }}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 font-display text-xs tracking-widest font-bold transition-all disabled:opacity-50"
            style={{ background: "oklch(0.80 0.18 75 / 0.15)", border: "1px solid oklch(0.80 0.18 75 / 0.4)", color: "oklch(0.80 0.18 75)" }}
          >
            <Pause size={13} />
            {pauseMut.isPending ? "PAUSANDO..." : "PAUSAR ZONA"}
          </button>
        ) : (
          <button
            onClick={() => unpauseMut.mutate({ zoneId: zone.id })}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2 font-display text-xs tracking-widest font-bold transition-all disabled:opacity-50 glow-green"
            style={{ background: "oklch(0.70 0.18 145 / 0.15)", border: "1px solid oklch(0.70 0.18 145 / 0.4)", color: "oklch(0.70 0.18 145)" }}
          >
            <Play size={13} />
            {unpauseMut.isPending ? "ATIVANDO..." : "ATIVAR ZONA"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Services() {
  const zonesQuery = trpc.cloudflare.listZones.useQuery(undefined, { retry: false });
  const zones = (zonesQuery.data as Zone[]) || [];

  const activeCount = zones.filter(z => !z.paused && z.status === "active").length;
  const pausedCount = zones.filter(z => z.paused).length;

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8" style={{ background: "oklch(0.72 0.18 210)" }} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-widest text-glow">CONTROLE DE SERVIÇOS</h1>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              GERENCIAMENTO DE ZONAS // SUBIR E PAUSAR SERVIÇOS
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 p-4" style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}>
        <div className="flex items-center gap-2">
          <CheckCircle size={14} style={{ color: "oklch(0.70 0.18 145)" }} />
          <span className="font-display text-xs tracking-wider" style={{ color: "oklch(0.70 0.18 145)" }}>
            {activeCount} ATIVAS
          </span>
        </div>
        <div className="w-px h-4" style={{ background: "oklch(0.28 0.10 240)" }} />
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: "oklch(0.80 0.18 75)" }} />
          <span className="font-display text-xs tracking-wider" style={{ color: "oklch(0.80 0.18 75)" }}>
            {pausedCount} PAUSADAS
          </span>
        </div>
        <div className="w-px h-4" style={{ background: "oklch(0.28 0.10 240)" }} />
        <div className="flex items-center gap-2">
          <Server size={14} className="text-primary" />
          <span className="font-display text-xs tracking-wider text-primary">
            {zones.length} TOTAL
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => zonesQuery.refetch()}
          className="flex items-center gap-2 px-3 py-1 font-mono-tech text-xs transition-all hover:text-primary"
          style={{ border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.55 0.06 230)" }}
        >
          <RefreshCw size={12} className={zonesQuery.isFetching ? "animate-spin" : ""} />
          ATUALIZAR
        </button>
      </div>

      {/* Content */}
      {zonesQuery.isLoading && (
        <div className="p-12 text-center" style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}>
          <div className="font-mono-tech text-sm text-muted-foreground">
            CARREGANDO SERVIÇOS<span className="cursor-blink">_</span>
          </div>
        </div>
      )}

      {zonesQuery.error && (
        <div className="p-6" style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}>
          <div className="flex items-center gap-3 p-4" style={{ background: "oklch(0.60 0.22 25 / 0.1)", border: "1px solid oklch(0.60 0.22 25 / 0.3)" }}>
            <AlertTriangle size={16} style={{ color: "oklch(0.60 0.22 25)" }} />
            <div>
              <div className="font-display text-xs font-bold tracking-wider" style={{ color: "oklch(0.60 0.22 25)" }}>ERRO</div>
              <div className="font-mono-tech text-xs mt-1 text-muted-foreground">{zonesQuery.error.message}</div>
            </div>
          </div>
        </div>
      )}

      {!zonesQuery.isLoading && !zonesQuery.error && zones.length === 0 && (
        <div className="p-12 text-center" style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}>
          <Server size={40} className="mx-auto mb-4 text-muted-foreground opacity-20" />
          <div className="font-display text-sm tracking-wider text-muted-foreground">NENHUMA ZONA ENCONTRADA</div>
        </div>
      )}

      {zones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {zones.map(zone => (
            <ZoneCard key={zone.id} zone={zone} onRefresh={() => zonesQuery.refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}
