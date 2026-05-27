import { Suspense, lazy, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { LangProvider } from "@/lib/lang-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  loadHomePage,
  loadContactPage,
  loadEditPdfPage,
  loadNotFoundPage,
  loadPricingPage,
  loadPrivacyPage,
  loadTermsPage,
  loadToolPage,
  warmPrimaryRoutes,
} from "@/lib/route-preload";

const Home = lazy(loadHomePage);
const ToolPage = lazy(loadToolPage);
const EditPdfPage = lazy(loadEditPdfPage);
const Pricing = lazy(loadPricingPage);
const PrivacyPage = lazy(loadPrivacyPage);
const TermsPage = lazy(loadTermsPage);
const ContactPage = lazy(loadContactPage);
const NotFound = lazy(loadNotFoundPage);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function Router() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center px-6">
          <div className="pdfx-panel flex items-center gap-3 rounded-2xl px-5 py-3 text-sm text-muted-foreground">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
            Preparing PDFX...
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

function ThemedLayout() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const idleWindow = window as IdleWindow;
    const warmRoutes = () => {
      void warmPrimaryRoutes();
    };

    if (idleWindow.requestIdleCallback) {
      const idleHandle = idleWindow.requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(idleHandle);
    }

    const timeoutHandle = window.setTimeout(warmRoutes, 250);
    return () => window.clearTimeout(timeoutHandle);
  }, []);

  return (
    <div className="pdfx-page min-h-screen flex flex-col text-foreground relative">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Router />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LangProvider>
            <ThemedLayout />
            <Toaster />
          </LangProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
