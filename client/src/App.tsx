import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import DnsRecords from "./pages/DnsRecords";
import Services from "./pages/Services";
import Terminal from "./pages/Terminal";
import Deploy from "./pages/Deploy";
import Settings from "./pages/Settings";
import PanelLayout from "./components/PanelLayout";

function Router() {
  return (
    <PanelLayout>
      <Switch>
        <Route path={"/"} component={Dashboard} />
        <Route path={"/dns"} component={DnsRecords} />
        <Route path={"/services"} component={Services} />
        <Route path={"/terminal"} component={Terminal} />
        <Route path={"/deploy"} component={Deploy} />
        <Route path={"/settings"} component={Settings} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </PanelLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.07 250)",
                border: "1px solid oklch(0.28 0.10 240)",
                color: "oklch(0.96 0.02 220)",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 600,
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
