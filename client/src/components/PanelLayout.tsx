import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Globe,
  Server,
  Terminal as TerminalIcon,
  Settings,
  LayoutDashboard,
  LogOut,
  Wifi,
  WifiOff,
  ChevronRight,
  Cloud,
} from "lucide-react";

const navItems = [
  { path: "/", label: "DASHBOARD", icon: LayoutDashboard, desc: "Visão Geral" },
  { path: "/dns", label: "DNS RECORDS", icon: Globe, desc: "Registros DNS" },
  { path: "/services", label: "SERVIÇOS", icon: Server, desc: "Zonas & Status" },
  { path: "/deploy", label: "DEPLOY", icon: Cloud, desc: "Upload YAML" },
  { path: "/terminal", label: "TERMINAL", icon: TerminalIcon, desc: "Console CLI" },
  { path: "/settings", label: "CONFIG", icon: Settings, desc: "API Token" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const loading = false;
const isAuthenticated = true;

const user = {
  id: "dev",
  name: "Developer",
  email: "dev@local"
};

const logout = () => {};
  const handleLogout = () => { logout(); };
  const [location, navigate] = useLocation();
  const hasTokenQuery = trpc.cloudflare.hasToken.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <div className="min-h-screen blueprint-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-primary text-xl tracking-widest mb-4 text-glow">
            CF PANEL
          </div>
          <div className="font-mono-tech text-muted-foreground text-sm">
            INICIALIZANDO SISTEMA<span className="cursor-blink">_</span>
          </div>
        </div>
      </div>
    );
  }

  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen blueprint-bg flex items-center justify-center">
  //       <div className="cad-frame p-10 text-center" style={{ background: "oklch(0.13 0.07 250 / 0.95)", border: "1px solid oklch(0.28 0.10 240)" }}>
  //         {/* Corner decorations */}
  //         <div className="absolute top-3 left-3 text-primary font-mono-tech text-xs opacity-60">SYS.AUTH</div>
  //         <div className="absolute top-3 right-3 text-primary font-mono-tech text-xs opacity-60">v1.0.0</div>

  //         <div className="font-display text-primary text-3xl font-bold tracking-widest mb-2 text-glow">
  //           CF PANEL
  //         </div>
  //         <div className="font-mono-tech text-muted-foreground text-xs tracking-widest mb-1">
  //           CLOUDFLARE DNS MANAGEMENT SYSTEM
  //         </div>
  //         <div className="font-mono-tech text-primary text-xs tracking-widest mb-8 opacity-70">
  //           DOMÍNIO BASE: ademartognasca.com.br
  //         </div>

  //         <div className="w-full h-px bg-border mb-8 relative">
  //           <div className="absolute left-0 top-0 w-2 h-2 border-l border-t border-primary -translate-y-1/2" />
  //           <div className="absolute right-0 top-0 w-2 h-2 border-r border-t border-primary -translate-y-1/2" />
  //         </div>

  //         <a
  //           href={getLoginUrl()}
  //           className="inline-flex items-center gap-3 px-8 py-3 font-display text-sm tracking-widest font-bold uppercase transition-all duration-200 glow-blue"
  //           style={{
  //             background: "oklch(0.72 0.18 210)",
  //             color: "oklch(0.10 0.05 250)",
  //             border: "1px solid oklch(0.80 0.18 210)",
  //           }}
  //         >
  //           <Wifi size={16} />
  //           AUTENTICAR ACESSO
  //         </a>

  //         <div className="mt-6 font-mono-tech text-xs text-muted-foreground opacity-50">
  //           SECURE CONNECTION REQUIRED
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex blueprint-bg">
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col"
        style={{
          background: "oklch(0.11 0.07 250 / 0.98)",
          borderRight: "1px solid oklch(0.28 0.10 240)",
        }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: "oklch(0.28 0.10 240)" }}>
          <div className="font-display text-primary text-xl font-bold tracking-widest text-glow">
            CF PANEL
          </div>
          <div className="font-mono-tech text-xs text-muted-foreground mt-1 opacity-70">
            DNS MANAGEMENT SYSTEM
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full pulse-dot"
              style={{ background: hasTokenQuery.data?.hasToken ? "oklch(0.70 0.18 145)" : "oklch(0.80 0.18 75)" }}
            />
            <span className="font-mono-tech text-xs" style={{ color: hasTokenQuery.data?.hasToken ? "oklch(0.70 0.18 145)" : "oklch(0.80 0.18 75)" }}>
              {hasTokenQuery.data?.hasToken ? "API CONECTADA" : "TOKEN PENDENTE"}
            </span>
          </div>
        </div>

        {/* Domain info */}
        <div className="px-5 py-3 border-b" style={{ borderColor: "oklch(0.20 0.08 250)" }}>
          <div className="font-mono-tech text-xs text-muted-foreground opacity-60 mb-1">DOMÍNIO BASE</div>
          <div className="font-mono-tech text-xs text-primary truncate">ademartognasca.com.br</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left transition-all duration-150 group relative"
                style={{
                  background: isActive ? "oklch(0.72 0.18 210 / 0.12)" : "transparent",
                  borderLeft: isActive ? "2px solid oklch(0.72 0.18 210)" : "2px solid transparent",
                  color: isActive ? "oklch(0.90 0.10 210)" : "oklch(0.65 0.06 230)",
                }}
              >
                <Icon size={16} className={isActive ? "text-primary" : ""} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xs font-bold tracking-wider">{item.label}</div>
                  <div className="font-mono-tech text-xs opacity-50">{item.desc}</div>
                </div>
                {isActive && <ChevronRight size={12} className="text-primary opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t" style={{ borderColor: "oklch(0.28 0.10 240)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 flex items-center justify-center font-display text-xs font-bold"
              style={{ background: "oklch(0.72 0.18 210 / 0.2)", border: "1px solid oklch(0.72 0.18 210 / 0.4)", color: "oklch(0.72 0.18 210)" }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-ui text-sm font-semibold truncate">{user?.name || "Usuário"}</div>
              <div className="font-mono-tech text-xs text-muted-foreground opacity-60 truncate">{user?.email || ""}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 font-display text-xs tracking-wider transition-all duration-150 hover:text-destructive"
            style={{ border: "1px solid oklch(0.28 0.10 240)", color: "oklch(0.55 0.06 230)" }}
          >
            <LogOut size={12} />
            SAIR DO SISTEMA
          </button>
        </div>

        {/* Bottom CAD decoration */}
        <div className="px-5 py-2 border-t" style={{ borderColor: "oklch(0.20 0.08 250)" }}>
          <div className="font-mono-tech text-xs opacity-30 text-center">
            SYS.STATUS: ONLINE
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
