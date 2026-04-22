import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Settings as SettingsIcon, Key, Save, Eye, EyeOff, CheckCircle, AlertTriangle, ExternalLink, Shield } from "lucide-react";

export default function Settings() {
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [baseDomain, setBaseDomain] = useState("Ademar.tognasca.com.br");
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const settingsQuery = trpc.cloudflare.getSettings.useQuery(undefined, { retry: false });
  const saveMut = trpc.cloudflare.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      settingsQuery.refetch();
      setTestResult(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const zonesTestQuery = trpc.cloudflare.listZones.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setAccountId(settingsQuery.data.accountId || "");
      setBaseDomain(settingsQuery.data.baseDomain || "Ademar.tognasca.com.br");
    }
  }, [settingsQuery.data]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && !settingsQuery.data?.apiToken) {
      toast.error("Informe o token da API do Cloudflare.");
      return;
    }
    saveMut.mutate({
      apiToken: token || "__KEEP__",
      accountId: accountId || undefined,
      baseDomain,
    });
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const result = await zonesTestQuery.refetch();
      if (result.data) {
        const zones = result.data as Array<{ name: string }>;
        setTestResult({ ok: true, message: `Conexão OK! ${zones.length} zona(s) encontrada(s): ${zones.map(z => z.name).join(", ")}` });
      }
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "Erro desconhecido" });
    }
  };

  const labelStyle = {
    color: "oklch(0.72 0.18 210)",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    display: "block",
    marginBottom: "0.4rem",
  };

  const inputStyle = {
    background: "oklch(0.12 0.07 250)",
    border: "1px solid oklch(0.28 0.10 240)",
    color: "oklch(0.92 0.04 220)",
    padding: "0.6rem 0.75rem",
    width: "100%",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "0.85rem",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8" style={{ background: "oklch(0.72 0.18 210)" }} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-widest text-glow">CONFIGURAÇÕES</h1>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              AUTENTICAÇÃO & CONFIGURAÇÃO DA API CLOUDFLARE
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave}>
            <div
              className="cad-frame p-6"
              style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
            >
              <div className="flex items-center gap-2 mb-6 pb-4 border-b" style={{ borderColor: "oklch(0.28 0.10 240)" }}>
                <Key size={16} className="text-primary" />
                <span className="font-display text-sm font-bold tracking-wider">CREDENCIAIS DA API</span>
              </div>

              <div className="space-y-5">
                {/* API Token */}
                <div>
                  <label style={labelStyle}>Token da API Cloudflare</label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      style={{ ...inputStyle, paddingRight: "2.5rem" }}
                      placeholder={settingsQuery.data?.apiToken ? "Token salvo (••••" + (settingsQuery.data.apiToken.slice(-4)) + ") — deixe vazio para manter" : "Informe o token da API do Cloudflare"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="font-mono-tech text-xs mt-2 opacity-50" style={{ color: "oklch(0.65 0.06 230)" }}>
                    Acesse: Cloudflare Dashboard → My Profile → API Tokens → Create Token
                  </p>
                </div>

                {/* Account ID */}
                <div>
                  <label style={labelStyle}>Account ID (opcional)</label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    style={inputStyle}
                    placeholder="ID da conta Cloudflare (opcional)"
                  />
                </div>

                {/* Base domain */}
                <div>
                  <label style={labelStyle}>Domínio Base</label>
                  <input
                    type="text"
                    value={baseDomain}
                    onChange={e => setBaseDomain(e.target.value)}
                    style={inputStyle}
                    placeholder="Ademar.tognasca.com.br"
                  />
                  <p className="font-mono-tech text-xs mt-2 opacity-50" style={{ color: "oklch(0.65 0.06 230)" }}>
                    Domínio principal exibido no painel
                  </p>
                </div>
              </div>

              {/* Test result */}
              {testResult && (
                <div
                  className="mt-5 flex items-start gap-3 p-4"
                  style={{
                    background: testResult.ok ? "oklch(0.70 0.18 145 / 0.1)" : "oklch(0.60 0.22 25 / 0.1)",
                    border: `1px solid ${testResult.ok ? "oklch(0.70 0.18 145 / 0.4)" : "oklch(0.60 0.22 25 / 0.4)"}`,
                  }}
                >
                  {testResult.ok ? (
                    <CheckCircle size={16} style={{ color: "oklch(0.70 0.18 145)", flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={16} style={{ color: "oklch(0.60 0.22 25)", flexShrink: 0 }} />
                  )}
                  <div>
                    <div
                      className="font-display text-xs font-bold tracking-wider"
                      style={{ color: testResult.ok ? "oklch(0.70 0.18 145)" : "oklch(0.60 0.22 25)" }}
                    >
                      {testResult.ok ? "CONEXÃO ESTABELECIDA" : "FALHA NA CONEXÃO"}
                    </div>
                    <div className="font-mono-tech text-xs mt-1 text-muted-foreground">
                      {testResult.message}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t" style={{ borderColor: "oklch(0.28 0.10 240)" }}>
                <button
                  type="submit"
                  disabled={saveMut.isPending}
                  className="flex items-center gap-2 px-6 py-2 font-display text-xs tracking-widest font-bold transition-all disabled:opacity-50 glow-blue"
                  style={{ background: "oklch(0.72 0.18 210)", color: "oklch(0.10 0.05 250)" }}
                >
                  <Save size={14} />
                  {saveMut.isPending ? "SALVANDO..." : "SALVAR CONFIGURAÇÕES"}
                </button>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={zonesTestQuery.isFetching}
                  className="flex items-center gap-2 px-4 py-2 font-display text-xs tracking-widest transition-all disabled:opacity-50"
                  style={{ border: "1px solid oklch(0.72 0.18 210 / 0.5)", color: "oklch(0.72 0.18 210)" }}
                >
                  <Shield size={14} />
                  {zonesTestQuery.isFetching ? "TESTANDO..." : "TESTAR CONEXÃO"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Info panel */}
        <div className="space-y-4">
          {/* Current status */}
          <div
            className="cad-frame p-5"
            style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
          >
            <div className="font-display text-xs font-bold tracking-wider mb-4" style={{ color: "oklch(0.72 0.18 210)", fontSize: "0.65rem" }}>
              STATUS ATUAL
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-xs text-muted-foreground">API TOKEN</span>
                <span
                  className="font-mono-tech text-xs"
                  style={{ color: settingsQuery.data?.apiToken ? "oklch(0.70 0.18 145)" : "oklch(0.60 0.22 25)" }}
                >
                  {settingsQuery.data?.apiToken ? "CONFIGURADO" : "PENDENTE"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-xs text-muted-foreground">DOMÍNIO BASE</span>
                <span className="font-mono-tech text-xs text-primary">
                  {settingsQuery.data?.baseDomain || "Não definido"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-xs text-muted-foreground">ACCOUNT ID</span>
                <span className="font-mono-tech text-xs" style={{ color: "oklch(0.65 0.06 230)" }}>
                  {settingsQuery.data?.accountId ? settingsQuery.data.accountId.slice(0, 8) + "..." : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Help */}
          <div
            className="cad-frame p-5"
            style={{ background: "oklch(0.13 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
          >
            <div className="font-display text-xs font-bold tracking-wider mb-4" style={{ color: "oklch(0.72 0.18 210)", fontSize: "0.65rem" }}>
              COMO OBTER O TOKEN
            </div>
            <ol className="space-y-2">
              {[
                "Acesse dash.cloudflare.com",
                "Clique em My Profile",
                "Vá em API Tokens",
                "Clique em Create Token",
                "Use o template Edit zone DNS",
                "Copie e cole o token acima",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono-tech text-xs" style={{ color: "oklch(0.72 0.18 210)", minWidth: "1rem" }}>{i + 1}.</span>
                  <span className="font-mono-tech text-xs text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-4 font-mono-tech text-xs transition-all hover:text-primary"
              style={{ color: "oklch(0.72 0.18 210 / 0.7)" }}
            >
              <ExternalLink size={11} />
              Abrir Cloudflare Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
