import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { ThemeProvider } from "@/lib/theme";
import { LangProvider } from "@/lib/lang-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AnimatedBackground } from "@/components/animated-background";
import NotFound from "@/pages/not-found";

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
            background: "radial-gradient(circle at top, rgba(30,41,59,0.4) 0%, rgba(2,6,23,0) 30%), linear-gradient(135deg, #020617 0%, #0a0f2e 35%, #020617 65%, #0a0f2e 100%)",
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
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;
