import { lazy, Suspense, Component, type ReactNode } from "react";
import { Switch, Route } from "wouter";
import { ThemeProvider } from "@/lib/theme";
import { LangProvider } from "@/lib/lang-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnimatedBackground } from "@/components/animated-background";

const Home = lazy(() => import("@/pages/home"));
const ToolPage = lazy(() => import("@/pages/tool-page"));
const EditPdfPage = lazy(() => import("@/pages/edit-pdf-page"));
const Pricing = lazy(() => import("@/pages/pricing"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const TermsPage = lazy(() => import("@/pages/terms"));
const ContactPage = lazy(() => import("@/pages/contact"));
const NotFound = lazy(() => import("@/pages/not-found"));

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

function Router() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center px-6">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-3 text-sm text-slate-300">
            Loading PDFX...
          </div>
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tools/edit-pdf" component={EditPdfPage} />
        <Route path="/tools/:slug" component={ToolPage} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/contact" component={ContactPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
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
