import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, RefreshCw, Globe, X, Save, AlertTriangle } from "lucide-react";

type DnsRecord = {
  id: string; type: string; name: string; content: string;
  ttl: number; proxied: boolean; priority?: number;
  created_on?: string; modified_on?: string;
};

type Zone = { id: string; name: string; status: string; paused: boolean };

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"] as const;

function RecordForm({
  zoneId, initial, onClose, onSaved,
}: {
  zoneId: string;
  initial?: DnsRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    type: (initial?.type as typeof DNS_TYPES[number]) || "A",
    name: initial?.name || "",
    content: initial?.content || "",
    ttl: initial?.ttl || 1,
    proxied: initial?.proxied || false,
    priority: initial?.priority || 10,
  });

  const createMut = trpc.cloudflare.createDnsRecord.useMutation({
    onSuccess: () => { toast.success("Registro criado com sucesso!"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.cloudflare.updateDnsRecord.useMutation({
    onSuccess: () => { toast.success("Registro atualizado!"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = createMut.isPending || updateMut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initial) {
      updateMut.mutate({ zoneId, recordId: initial.id, ...form });
    } else {
      createMut.mutate({ zoneId, ...form });
    }
  };

  const labelStyle = { color: "oklch(0.72 0.18 210)", fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const };
  const inputStyle = { background: "oklch(0.12 0.07 250)", border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.92 0.04 220)", padding: "0.5rem 0.75rem", width: "100%", fontFamily: "'Share Tech Mono', monospace", fontSize: "0.85rem" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "oklch(0.05 0.05 250 / 0.85)" }}
    >
      <div
        className="cad-frame w-full max-w-lg p-6 relative"
        style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.40 0.14 230)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-sm font-bold tracking-widest text-glow">
              {initial ? "EDITAR REGISTRO DNS" : "NOVO REGISTRO DNS"}
            </h2>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              ZONA: {zoneId.slice(0, 16)}...
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Tipo</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof DNS_TYPES[number] }))}
                style={inputStyle}
                className="mt-1"
              >
                {DNS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>TTL</label>
              <input
                type="number"
                value={form.ttl}
                onChange={e => setForm(f => ({ ...f, ttl: parseInt(e.target.value) || 1 }))}
                style={inputStyle}
                className="mt-1"
                placeholder="1 = Auto"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={inputStyle}
              className="mt-1"
              placeholder="@ ou subdomínio"
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Conteúdo / Destino</label>
            <input
              type="text"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              style={inputStyle}
              className="mt-1"
              placeholder={form.type === "A" ? "192.168.1.1" : form.type === "CNAME" ? "destino.exemplo.com" : "valor do registro"}
              required
            />
          </div>

          {form.type === "MX" && (
            <div>
              <label style={labelStyle}>Prioridade</label>
              <input
                type="number"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 10 }))}
                style={inputStyle}
                className="mt-1"
              />
            </div>
          )}

          {(form.type === "A" || form.type === "AAAA" || form.type === "CNAME") && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="proxied"
                checked={form.proxied}
                onChange={e => setForm(f => ({ ...f, proxied: e.target.checked }))}
                style={{ width: "auto", accentColor: "oklch(0.72 0.18 210)" }}
              />
              <label htmlFor="proxied" style={{ ...labelStyle, cursor: "pointer" }}>
                PROXY CLOUDFLARE (proteção ativa)
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 font-display text-xs tracking-widest font-bold transition-all disabled:opacity-50"
              style={{ background: "oklch(0.72 0.18 210)", color: "oklch(0.10 0.05 250)" }}
            >
              <Save size={14} />
              {isLoading ? "SALVANDO..." : initial ? "ATUALIZAR" : "CRIAR REGISTRO"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-display text-xs tracking-widest transition-all"
              style={{ border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.55 0.06 230)" }}
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DnsRecords() {
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);
  const [filterType, setFilterType] = useState("ALL");

  const zonesQuery = trpc.cloudflare.listZones.useQuery(undefined, { retry: false });
  const zones = (zonesQuery.data as Zone[]) || [];

  const recordsQuery = trpc.cloudflare.listDnsRecords.useQuery(
    { zoneId: selectedZone },
    { enabled: !!selectedZone, retry: false }
  );
  const records = (recordsQuery.data as DnsRecord[]) || [];

  const deleteMut = trpc.cloudflare.deleteDnsRecord.useMutation({
    onSuccess: () => { toast.success("Registro deletado!"); recordsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filteredRecords = filterType === "ALL" ? records : records.filter(r => r.type === filterType);
  const recordTypes = ["ALL", ...Array.from(new Set(records.map(r => r.type))).sort()];

  const typeColor = (type: string) => {
    const colors: Record<string, string> = {
      A: "oklch(0.72 0.18 210)", AAAA: "oklch(0.65 0.22 195)", CNAME: "oklch(0.70 0.18 145)",
      MX: "oklch(0.80 0.18 75)", TXT: "oklch(0.72 0.22 300)", NS: "oklch(0.60 0.22 25)",
    };
    return colors[type] || "oklch(0.65 0.06 230)";
  };

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8" style={{ background: "oklch(0.72 0.18 210)" }} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-widest text-glow">DNS RECORDS</h1>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              GERENCIAMENTO DE REGISTROS DNS // ADEMAR.TOGNASCA.COM.BR
            </p>
          </div>
        </div>
      </div>

      {/* Zone selector */}
      <div
        className="p-4 mb-6"
        style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-primary" />
            <span className="font-display text-xs tracking-wider">SELECIONAR ZONA:</span>
          </div>
          {zonesQuery.isLoading ? (
            <span className="font-mono-tech text-xs text-muted-foreground">Carregando zonas...</span>
          ) : zonesQuery.error ? (
            <span className="font-mono-tech text-xs" style={{ color: "oklch(0.60 0.22 25)" }}>
              {zonesQuery.error.message}
            </span>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {zones.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className="px-3 py-1 font-mono-tech text-xs transition-all"
                  style={{
                    background: selectedZone === zone.id ? "oklch(0.72 0.18 210 / 0.2)" : "transparent",
                    border: `1px solid ${selectedZone === zone.id ? "oklch(0.72 0.18 210)" : "oklch(0.28 0.10 240)"}`,
                    color: selectedZone === zone.id ? "oklch(0.90 0.10 210)" : "oklch(0.65 0.06 230)",
                  }}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedZone && (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {recordTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className="px-3 py-1 font-mono-tech text-xs transition-all"
                  style={{
                    background: filterType === type ? `${typeColor(type)}22` : "transparent",
                    border: `1px solid ${filterType === type ? typeColor(type) : "oklch(0.28 0.10 240)"}`,
                    color: filterType === type ? typeColor(type) : "oklch(0.55 0.06 230)",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => recordsQuery.refetch()}
                className="flex items-center gap-2 px-3 py-2 font-mono-tech text-xs transition-all hover:text-primary"
                style={{ border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.55 0.06 230)" }}
              >
                <RefreshCw size={12} className={recordsQuery.isFetching ? "animate-spin" : ""} />
                ATUALIZAR
              </button>
              <button
                onClick={() => { setEditRecord(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 font-display text-xs tracking-widest font-bold transition-all glow-blue"
                style={{ background: "oklch(0.72 0.18 210)", color: "oklch(0.10 0.05 250)" }}
              >
                <Plus size={14} />
                NOVO REGISTRO
              </button>
            </div>
          </div>

          {/* Records table */}
          <div
            className="cad-frame"
            style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
          >
            {recordsQuery.isLoading && (
              <div className="p-8 text-center">
                <div className="font-mono-tech text-sm text-muted-foreground">
                  CARREGANDO REGISTROS<span className="cursor-blink">_</span>
                </div>
              </div>
            )}

            {recordsQuery.error && (
              <div className="p-6">
                <div className="flex items-center gap-3 p-4" style={{ background: "oklch(0.60 0.22 25 / 0.1)", border: "1px solid oklch(0.60 0.22 25 / 0.3)" }}>
                  <AlertTriangle size={16} style={{ color: "oklch(0.60 0.22 25)" }} />
                  <span className="font-mono-tech text-xs text-muted-foreground">{recordsQuery.error.message}</span>
                </div>
              </div>
            )}

            {!recordsQuery.isLoading && !recordsQuery.error && (
              <div className="overflow-x-auto">
                <table className="tech-table w-full">
                  <thead>
                    <tr>
                      <th>TIPO</th>
                      <th>NOME</th>
                      <th>CONTEÚDO</th>
                      <th>TTL</th>
                      <th>PROXY</th>
                      <th>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8">
                          <span className="font-mono-tech text-xs text-muted-foreground">NENHUM REGISTRO ENCONTRADO</span>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map(record => (
                        <tr key={record.id}>
                          <td>
                            <span
                              className="font-mono-tech text-xs px-2 py-1 font-bold"
                              style={{
                                background: `${typeColor(record.type)}18`,
                                border: `1px solid ${typeColor(record.type)}40`,
                                color: typeColor(record.type),
                              }}
                            >
                              {record.type}
                            </span>
                          </td>
                          <td className="font-mono-tech text-sm max-w-xs truncate">{record.name}</td>
                          <td className="font-mono-tech text-sm max-w-xs truncate text-muted-foreground">{record.content}</td>
                          <td className="font-mono-tech text-xs text-muted-foreground">{record.ttl === 1 ? "AUTO" : record.ttl}</td>
                          <td>
                            <span
                              className="font-mono-tech text-xs"
                              style={{ color: record.proxied ? "oklch(0.70 0.18 145)" : "oklch(0.45 0.06 230)" }}
                            >
                              {record.proxied ? "ON" : "OFF"}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setEditRecord(record); setShowForm(true); }}
                                className="p-1 transition-all hover:text-primary"
                                style={{ color: "oklch(0.55 0.06 230)" }}
                                title="Editar"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Deletar registro ${record.type} ${record.name}?`)) {
                                    deleteMut.mutate({ zoneId: selectedZone, recordId: record.id });
                                  }
                                }}
                                className="p-1 transition-all"
                                style={{ color: "oklch(0.55 0.06 230)" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.60 0.22 25)")}
                                onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.55 0.06 230)")}
                                title="Deletar"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {filteredRecords.length > 0 && (
              <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: "oklch(0.20 0.07 250)" }}>
                <span className="font-mono-tech text-xs text-muted-foreground opacity-60">
                  {filteredRecords.length} REGISTRO{filteredRecords.length !== 1 ? "S" : ""} EXIBIDO{filteredRecords.length !== 1 ? "S" : ""}
                </span>
                <span className="font-mono-tech text-xs text-muted-foreground opacity-40">
                  TOTAL: {records.length}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedZone && !zonesQuery.isLoading && !zonesQuery.error && (
        <div
          className="p-12 text-center"
          style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
        >
          <Globe size={40} className="mx-auto mb-4 text-muted-foreground opacity-20" />
          <div className="font-display text-sm tracking-wider text-muted-foreground">
            SELECIONE UMA ZONA PARA VER OS REGISTROS DNS
          </div>
        </div>
      )}

      {showForm && selectedZone && (
        <RecordForm
          zoneId={selectedZone}
          initial={editRecord || undefined}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSaved={() => recordsQuery.refetch()}
        />
      )}
    </div>
  );
}
