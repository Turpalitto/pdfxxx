import { Suspense, lazy, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Title skeleton */}
          <div className="mb-3 h-7 w-2/3 max-w-xs animate-pulse rounded-lg bg-foreground/10 sm:h-9" />
          <div className="mb-8 h-4 w-full max-w-md animate-pulse rounded-md bg-foreground/[0.07]" />
          {/* Upload / content panel skeleton */}
          <div className="pdfx-panel rounded-2xl p-6 sm:p-8">
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-foreground/10" />
              <div className="h-4 w-48 animate-pulse rounded-md bg-foreground/[0.07]" />
              <div className="h-40 w-full animate-pulse rounded-xl border border-dashed border-foreground/15 bg-foreground/[0.04]" />
              <div className="h-10 w-40 animate-pulse rounded-lg bg-foreground/10" />
            </div>
          </div>
          <span className="sr-only">Preparing PDFX...</span>
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-1.5 focus:text-sm focus:text-black focus:shadow-lg">
        Skip to main content
      </a>
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main id="main-content" className="flex-1">
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
          </LangProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
