import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Play, Square, Zap, Cloud, AlertCircle, CheckCircle, Clock } from "lucide-react";

type Site = {
  id: number;
  name: string;
  type: string;
  port: number;
  domain: string;
  status: "stopped" | "running" | "error";
  deploymentMethod: "tunnel" | "pages" | "workers";
  dockerEnabled: boolean;
};

export default function Deploy() {
  const [yamlContent, setYamlContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadYamlMut = trpc.deployment.uploadYaml.useMutation();
  const listSitesQuery = trpc.deployment.listSites.useQuery();
  const startSiteMut = trpc.deployment.startSite.useMutation();
  const stopSiteMut = trpc.deployment.stopSite.useMutation();
  const deployToTunnelMut = trpc.deployment.deployToTunnel.useMutation();
  const deployToPagesMut = trpc.deployment.deployToPages.useMutation();

  const sites = (listSitesQuery.data as Site[]) || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setYamlContent(content);
    };
    reader.readAsText(file);
  };

  const handleUploadYaml = async () => {
    if (!yamlContent.trim()) {
      toast.error("Cole ou selecione um arquivo YAML");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadYamlMut.mutateAsync({ yamlContent });
      toast.success(`✓ ${result.count} sites carregados!`);
      setYamlContent("");
      listSitesQuery.refetch();
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartSite = async (siteId: number, siteName: string) => {
    try {
      await startSiteMut.mutateAsync({ siteId });
      toast.success(`✓ ${siteName} iniciado`);
      listSitesQuery.refetch();
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleStopSite = async (siteId: number, siteName: string) => {
    try {
      await stopSiteMut.mutateAsync({ siteId });
      toast.success(`✓ ${siteName} parado`);
      listSitesQuery.refetch();
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeployToTunnel = async (siteId: number, siteName: string) => {
    try {
      const result = await deployToTunnelMut.mutateAsync({ siteId });
      toast.success(`✓ Tunnel criado: ${result.tunnelUrl}`);
      listSitesQuery.refetch();
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDeployToPages = async (siteId: number, siteName: string) => {
    try {
      const result = await deployToPagesMut.mutateAsync({ siteId });
      toast.success(`✓ Deployado em ${result.url}`);
      listSitesQuery.refetch();
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle size={16} className="text-green-500" />;
      case "error":
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "oklch(0.70 0.20 145)";
      case "error":
        return "oklch(0.60 0.22 25)";
      default:
        return "oklch(0.80 0.18 75)";
    }
  };

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8" style={{ background: "oklch(0.72 0.18 210)" }} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-widest text-glow">DEPLOYMENT</h1>
            <p className="font-mono-tech text-xs text-muted-foreground mt-1">
              UPLOAD YAML // GERENCIAR SITES // DEPLOY AUTOMÁTICO
            </p>
          </div>
        </div>
      </div>

      {/* YAML Upload Section */}
      <div
        className="mb-6 p-4"
        style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Upload size={14} className="text-primary" />
          <span className="font-display text-xs tracking-wider">UPLOAD YAML</span>
        </div>

        <textarea
          value={yamlContent}
          onChange={(e) => setYamlContent(e.target.value)}
          placeholder="Cole seu YAML aqui ou selecione um arquivo..."
          className="w-full h-32 p-3 font-mono-tech text-xs bg-transparent border rounded"
          style={{ borderColor: "oklch(0.28 0.10 240)", color: "oklch(0.92 0.04 220)" }}
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 font-display text-xs tracking-wider transition-all"
            style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
          >
            <Upload size={12} />
            SELECIONAR ARQUIVO
          </button>
          <button
            onClick={handleUploadYaml}
            disabled={isUploading || !yamlContent.trim()}
            className="flex items-center gap-2 px-3 py-2 font-display text-xs tracking-wider transition-all disabled:opacity-40"
            style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
          >
            {isUploading ? "PROCESSANDO..." : "CARREGAR YAML"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Sites Grid */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-primary" />
          <span className="font-display text-xs tracking-wider">SITES CONFIGURADOS ({sites.length})</span>
        </div>

        {sites.length === 0 ? (
          <div
            className="p-4 text-center"
            style={{ background: "oklch(0.14 0.07 250)", border: "1px dashed oklch(0.28 0.10 240)" }}
          >
            <p className="font-mono-tech text-xs text-muted-foreground">Nenhum site configurado. Carregue um YAML para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sites.map((site) => (
              <div
                key={site.id}
                className="p-4"
                style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
              >
                {/* Site Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(site.status)}
                      <span className="font-display text-sm font-bold tracking-wider">{site.name}</span>
                    </div>
                    <p className="font-mono-tech text-xs text-muted-foreground">
                      {site.type} • porta {site.port}
                    </p>
                  </div>
                  <span
                    className="font-mono-tech text-xs px-2 py-1 rounded"
                    style={{ background: `${getStatusColor(site.status)}22`, color: getStatusColor(site.status), border: `1px solid ${getStatusColor(site.status)}` }}
                  >
                    {site.status.toUpperCase()}
                  </span>
                </div>

                {/* Domain */}
                <div className="mb-3 pb-3 border-b" style={{ borderColor: "oklch(0.22 0.08 250)" }}>
                  <p className="font-mono-tech text-xs text-muted-foreground mb-1">DOMÍNIO:</p>
                  <p className="font-mono-tech text-xs" style={{ color: "oklch(0.72 0.18 210)" }}>
                    {site.domain}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex gap-2 flex-wrap">
                  {site.status === "running" ? (
                    <button
                      onClick={() => handleStopSite(site.id, site.name)}
                      disabled={stopSiteMut.isPending}
                      className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs transition-all"
                      style={{ background: "oklch(0.60 0.22 25 / 0.2)", border: "1px solid oklch(0.60 0.22 25 / 0.4)", color: "oklch(0.60 0.22 25)" }}
                    >
                      <Square size={10} />
                      PARAR
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartSite(site.id, site.name)}
                      disabled={startSiteMut.isPending}
                      className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs transition-all"
                      style={{ background: "oklch(0.70 0.20 145 / 0.2)", border: "1px solid oklch(0.70 0.20 145 / 0.4)", color: "oklch(0.70 0.20 145)" }}
                    >
                      <Play size={10} />
                      INICIAR
                    </button>
                  )}

                  {site.deploymentMethod === "tunnel" && (
                    <button
                      onClick={() => handleDeployToTunnel(site.id, site.name)}
                      disabled={deployToTunnelMut.isPending}
                      className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs transition-all"
                      style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
                    >
                      <Cloud size={10} />
                      TUNNEL
                    </button>
                  )}

                  {site.deploymentMethod === "pages" && (
                    <button
                      onClick={() => handleDeployToPages(site.id, site.name)}
                      disabled={deployToPagesMut.isPending}
                      className="flex items-center gap-1 px-2 py-1 font-mono-tech text-xs transition-all"
                      style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
                    >
                      <Cloud size={10} />
                      PAGES
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Example YAML */}
      <div
        className="p-4"
        style={{ background: "oklch(0.14 0.07 250)", border: "1px solid oklch(0.28 0.10 240)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={14} className="text-primary" />
          <span className="font-display text-xs tracking-wider">EXEMPLO DE YAML</span>
        </div>
        <pre className="font-mono-tech text-xs overflow-x-auto p-3 bg-black/20 rounded" style={{ color: "oklch(0.92 0.04 220)" }}>
{`sites:
  - name: meu-site-react
    type: react
    port: 3000
    docker: true
    domain: site1.ademar.tognasca.com.br
    deploymentMethod: tunnel
    
  - name: meu-site-angular
    type: angular
    port: 4200
    docker: true
    domain: site2.ademar.tognasca.com.br
    deploymentMethod: pages
    
  - name: meu-mvc
    type: mvc
    port: 8080
    docker: true
    domain: site3.ademar.tognasca.com.br
    deploymentMethod: tunnel`}
        </pre>
      </div>
    </div>
  );
}
