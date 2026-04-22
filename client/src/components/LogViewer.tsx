import { useEffect, useRef, useState } from "react";
import { X, Filter, Copy, Download } from "lucide-react";
import { toast } from "sonner";

export type LogLevel = "info" | "warn" | "error" | "success";

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  createdAt: Date;
}

interface LogViewerProps {
  logs: LogEntry[];
  isOpen: boolean;
  onClose: () => void;
  siteName: string;
  isLoading?: boolean;
}

const getLevelColor = (level: LogLevel) => {
  switch (level) {
    case "success":
      return "oklch(0.70 0.20 145)";
    case "error":
      return "oklch(0.60 0.22 25)";
    case "warn":
      return "oklch(0.80 0.18 75)";
    default:
      return "oklch(0.72 0.18 210)";
  }
};

const getLevelBg = (level: LogLevel) => {
  switch (level) {
    case "success":
      return "oklch(0.70 0.20 145 / 0.1)";
    case "error":
      return "oklch(0.60 0.22 25 / 0.1)";
    case "warn":
      return "oklch(0.80 0.18 75 / 0.1)";
    default:
      return "oklch(0.72 0.18 210 / 0.1)";
  }
};

export default function LogViewer({ logs, isOpen, onClose, siteName, isLoading }: LogViewerProps) {
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = filter === "all" ? logs : logs.filter(log => log.level === filter);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredLogs]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.level.toUpperCase()}] ${new Date(log.createdAt).toLocaleTimeString()}: ${log.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Logs copiados!");
  };

  const handleDownloadLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.level.toUpperCase()}] ${new Date(log.createdAt).toLocaleTimeString()}: ${log.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${siteName}-${new Date().toISOString()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Logs baixados!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0, 0, 0, 0.7)" }}>
      <div
        className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded"
        style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "oklch(0.28 0.10 240)" }}
        >
          <div>
            <h2 className="font-display text-lg font-bold tracking-wider">{siteName.toUpperCase()}</h2>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">LOGS DE DEPLOYMENT</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div
          className="flex items-center gap-2 p-3 border-b"
          style={{ borderColor: "oklch(0.28 0.10 240)" }}
        >
          <Filter size={14} className="text-primary" />
          <span className="font-mono-tech text-xs text-muted-foreground">FILTRAR:</span>
          <div className="flex gap-2">
            {(["all", "info", "success", "warn", "error"] as const).map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className="px-2 py-1 font-mono-tech text-xs rounded transition-all"
                style={{
                  background: filter === level ? `${getLevelColor(level === "all" ? "info" : level)}22` : "transparent",
                  color: filter === level ? getLevelColor(level === "all" ? "info" : level) : "oklch(0.60 0.08 220)",
                  border: `1px solid ${filter === level ? getLevelColor(level === "all" ? "info" : level) : "oklch(0.28 0.10 240)"}`,
                }}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs rounded transition-all"
            style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
          >
            <Copy size={12} />
            COPIAR
          </button>
          <button
            onClick={handleDownloadLogs}
            className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs rounded transition-all"
            style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
          >
            <Download size={12} />
            BAIXAR
          </button>
        </div>

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto p-4 font-mono-tech text-xs" style={{ background: "oklch(0.10 0.05 250)" }}>
          {isLoading && filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Carregando logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Nenhum log disponível</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, idx) => (
                <div
                  key={`${log.id}-${idx}`}
                  className="p-2 rounded"
                  style={{
                    background: getLevelBg(log.level),
                    borderLeft: `3px solid ${getLevelColor(log.level)}`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="font-bold whitespace-nowrap"
                      style={{ color: getLevelColor(log.level) }}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="flex-1 break-words" style={{ color: "oklch(0.92 0.04 220)" }}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 border-t text-right"
          style={{ borderColor: "oklch(0.28 0.10 240)" }}
        >
          <p className="font-mono-tech text-xs text-muted-foreground">
            {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""} exibido{filteredLogs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
