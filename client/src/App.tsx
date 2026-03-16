import { lazy, Suspense, useEffect, Component, type ReactNode } from "react";
import { Switch, Route } from "wouter";
import { ThemeProvider } from "@/lib/theme";
import { LangProvider } from "@/lib/lang-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnimatedBackground } from "@/components/animated-background";
import NotFound from "@/pages/not-found";

/* ── Error Boundary ──────────────────────────────────────────── */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div
            className="mb-6 flex size-20 items-center justify-center rounded-2xl"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Something went wrong</h2>
          <p className="mb-6 max-w-sm text-sm text-slate-500">
            {(this.state.error as Error).message || "An unexpected error occurred."}
          </p>
          <button
            className="rounded-xl bg-white/8 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/12"
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const importHomePage = () => import("@/pages/home");
const importToolPage = () => import("@/pages/tool-page");
const importEditPdfPage = () => import("@/pages/edit-pdf-page");
const importPricingPage = () => import("@/pages/pricing");

const Home = lazy(importHomePage);
const ToolPage = lazy(importToolPage);
const EditPdfPage = lazy(importEditPdfPage);
const Pricing = lazy(importPricingPage);

function RouteFallback() {
  return (
    <div className="route-fallback">
      <div className="route-fallback__bar" />
      <div className="route-fallback__hero" />
      <div className="route-fallback__grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="route-fallback__card" />
        ))}
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tools/edit-pdf" component={EditPdfPage} />
        <Route path="/tools/:slug" component={ToolPage} />
        <Route path="/pricing" component={Pricing} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const win = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (connection?.saveData) {
      return;
    }

    const prefetch = () => {
      void importToolPage();
      void importEditPdfPage();
      void importPricingPage();
    };

    if (typeof win.requestIdleCallback === "function" && typeof win.cancelIdleCallback === "function") {
      const idleId = win.requestIdleCallback(prefetch, { timeout: 2000 });
      return () => win.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(prefetch, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <ThemeProvider>
      <LangProvider>
        <div
          className="min-h-screen flex flex-col text-foreground relative"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(124,58,237,0.10) 0%, transparent 60%), #030712",
          }}
        >
          <AnimatedBackground />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </div>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;
