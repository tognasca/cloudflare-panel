import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Terminal as TerminalIcon, Send, Trash2, ChevronRight, Globe, Check } from "lucide-react";

type HistoryEntry = {
  id: string;
  command: string;
  output: string;
  status: "success" | "error" | "running";
  timestamp: Date;
};

type Zone = { id: string; name: string; status: string; paused: boolean };

const HELP_TEXT = `╔══════════════════════════════════════════════════════════════╗
║         CF PANEL - CLOUDFLARE CLI TERMINAL v2.0              ║
║         DOMÍNIO BASE: ademartognasca.com.br                 ║
╚══════════════════════════════════════════════════════════════╝

COMANDOS DISPONÍVEIS:
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
  help                           - Exibir esta ajuda

EXEMPLOS (com zona padrão selecionada):
  dns list
  dns create A www 192.168.1.1 3600 false
  zone pause
  zone info
`;

export default function Terminal() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: "welcome",
      command: "",
      output: HELP_TEXT,
      status: "success",
      timestamp: new Date(),
    }
  ]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const execMut = trpc.cloudflare.executeCommand.useMutation();
  const zonesQuery = trpc.cloudflare.listZones.useQuery(undefined, { retry: false });
  const zones = (zonesQuery.data as Zone[]) || [];

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const runCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (trimmed === "clear") {
      setHistory([]);
      setCmdHistory(prev => [trimmed, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
      setInput("");
      return;
    }

    const entryId = `cmd-${Date.now()}`;
    const newEntry: HistoryEntry = {
      id: entryId,
      command: trimmed,
      output: "",
      status: "running",
      timestamp: new Date(),
    };

    setHistory(prev => [...prev, newEntry]);
    setCmdHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    setInput("");
    setIsRunning(true);

    try {
      const result = await execMut.mutateAsync({ command: trimmed, defaultZoneId: selectedZoneId });
      
      if (result.output === "__CLEAR__") {
        setHistory([]);
      } else {
        setHistory(prev =>
          prev.map(e =>
            e.id === entryId
              ? { ...e, output: result.output, status: result.status }
              : e
          )
        );
      }
    } catch (err) {
      setHistory(prev =>
        prev.map(e =>
          e.id === entryId
            ? { ...e, output: `Erro: ${err instanceof Error ? err.message : String(err)}`, status: "error" }
            : e
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, cmdHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(cmdHistory[newIndex] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setInput(newIndex === -1 ? "" : cmdHistory[newIndex] || "");
    }
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  return (
    <div className="p-6 min-h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8" style={{ background: "oklch(0.72 0.18 210)" }} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-widest text-glow">TERMINAL CLI</h1>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              CONSOLE DE COMANDOS // CLOUDFLARE API DIRECT ACCESS
            </p>
          </div>
        </div>
      </div>

      {/* Zone selector */}
      <div
        className="mb-4 p-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
      >
        <div className="flex items-center gap-3">
          <Globe size={14} className="text-primary" />
          <span className="font-display text-xs tracking-wider">ZONA PADRÃO:</span>
        </div>
        {zonesQuery.isLoading ? (
          <span className="font-mono-tech text-xs text-muted-foreground">Carregando zonas...</span>
        ) : zonesQuery.error ? (
          <span className="font-mono-tech text-xs" style={{ color: "oklch(0.60 0.22 25)" }}>
            Erro ao carregar zonas
          </span>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedZoneId("")}
              className="px-3 py-1 font-mono-tech text-xs transition-all flex items-center gap-1"
              style={{
                background: !selectedZoneId ? "oklch(0.72 0.18 210 / 0.2)" : "transparent",
                border: `1px solid ${!selectedZoneId ? "oklch(0.72 0.18 210)" : "oklch(0.28 0.10 240)"}`,
                color: !selectedZoneId ? "oklch(0.90 0.10 210)" : "oklch(0.65 0.06 230)",
              }}
            >
              {!selectedZoneId && <Check size={10} />}
              NENHUMA
            </button>
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => setSelectedZoneId(zone.id)}
                className="px-3 py-1 font-mono-tech text-xs transition-all flex items-center gap-1"
                style={{
                  background: selectedZoneId === zone.id ? "oklch(0.72 0.18 210 / 0.2)" : "transparent",
                  border: `1px solid ${selectedZoneId === zone.id ? "oklch(0.72 0.18 210)" : "oklch(0.28 0.10 240)"}`,
                  color: selectedZoneId === zone.id ? "oklch(0.90 0.10 210)" : "oklch(0.65 0.06 230)",
                }}
                title={zone.id}
              >
                {selectedZoneId === zone.id && <Check size={10} />}
                {zone.name.split(".")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Terminal window */}
      <div
        className="flex-1 flex flex-col cad-frame"
        style={{ background: "oklch(0.08 0.05 250)", border: "1px solid oklch(0.28 0.10 240)", minHeight: "500px" }}
      >
        {/* Terminal title bar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ background: "oklch(0.12 0.07 250)", borderColor: "oklch(0.28 0.10 240)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.60 0.22 25)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.80 0.18 75)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.70 0.18 145)" }} />
            </div>
            <span className="font-mono-tech text-xs text-muted-foreground opacity-60">
              cf-panel — bash — 80×24
              {selectedZone && (
                <span style={{ color: "oklch(0.72 0.18 210)" }}>
                  {" "}| zona: {selectedZone.name}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="font-mono-tech text-xs" style={{ color: "oklch(0.80 0.18 75)" }}>
                EXECUTANDO...
              </span>
            )}
            <button
              onClick={() => setHistory([])}
              className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs transition-all hover:text-destructive"
              style={{ color: "oklch(0.45 0.06 230)" }}
              title="Limpar terminal"
            >
              <Trash2 size={11} />
              LIMPAR
            </button>
          </div>
        </div>

        {/* Output area */}
        <div
          ref={outputRef}
          className="flex-1 p-4 overflow-y-auto"
          style={{ minHeight: "400px", maxHeight: "calc(100vh - 320px)" }}
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((entry) => (
            <div key={entry.id} className="mb-3">
              {entry.command && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="terminal-prompt font-bold">
                    [cf-panel@ademartognasca.com.br]$
                  </span>
                  <span className="font-mono-tech text-sm" style={{ color: "oklch(0.92 0.04 220)" }}>
                    {entry.command}
                  </span>
                </div>
              )}
              {entry.status === "running" ? (
                <div className="font-mono-tech text-xs" style={{ color: "oklch(0.80 0.18 75)" }}>
                  PROCESSANDO<span className="cursor-blink">_</span>
                </div>
              ) : (
                <pre
                  className={`font-mono-tech text-xs whitespace-pre-wrap leading-relaxed ${entry.status === "error" ? "terminal-error" : entry.command ? "terminal-output" : "terminal-info"}`}
                >
                  {entry.output}
                </pre>
              )}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-t"
          style={{ borderColor: "oklch(0.22 0.08 250)", background: "oklch(0.10 0.06 250)" }}
        >
          <span className="terminal-prompt font-bold text-sm whitespace-nowrap">
            [cf-panel@ademartognasca.com.br]$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder={isRunning ? "aguardando resposta..." : "digite um comando (help para ajuda)"}
            autoFocus
            className="flex-1 bg-transparent outline-none font-mono-tech text-sm"
            style={{
              border: "none",
              color: "oklch(0.92 0.04 220)",
              caretColor: "oklch(0.72 0.18 210)",
            }}
          />
          <button
            onClick={() => runCommand(input)}
            disabled={isRunning || !input.trim()}
            className="flex items-center gap-1 px-3 py-1 font-display text-xs tracking-wider transition-all disabled:opacity-30"
            style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
          >
            <Send size={11} />
            RUN
          </button>
        </div>
      </div>

      {/* Quick commands */}
      <div className="mt-4">
        <div className="font-display text-xs tracking-widest mb-3" style={{ color: "oklch(0.72 0.18 210)", fontSize: "0.65rem" }}>
          COMANDOS RÁPIDOS
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "zones list",
            "dns list",
            "help",
          ].map(cmd => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              disabled={isRunning || (cmd !== "zones list" && cmd !== "help" && !selectedZoneId)}
              className="flex items-center gap-1 px-3 py-1 font-mono-tech text-xs transition-all hover:text-primary disabled:opacity-40"
              style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.65 0.06 230)" }}
              title={cmd !== "zones list" && cmd !== "help" && !selectedZoneId ? "Selecione uma zona padrão" : ""}
            >
              <ChevronRight size={10} />
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
