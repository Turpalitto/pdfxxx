import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LangProvider>
            <div
              className="min-h-screen flex flex-col text-foreground relative"
              style={{
                background: "linear-gradient(135deg, #020617 0%, #0a0f2e 35%, #020617 65%, #0a0f2e 100%)",
              }}
            >
              <AnimatedBackground />
              <div className="relative z-10 flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
              </div>
            </div>
            <Toaster />
          </LangProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
