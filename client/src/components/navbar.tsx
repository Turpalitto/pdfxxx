import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText, ChevronDown, Globe, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { categories, getCategoryLabel } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { loadContactPage, loadHomePage, loadPricingPage } from "@/lib/route-preload";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [location] = useLocation();
  const langRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const isPricing = (location as string) === "/pricing";
  const isDark = theme === "dark";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((item) => item.code === lang) || LANGUAGES[0];

  return (
    <header
      className="sticky top-3 z-50 mx-auto w-[min(1240px,calc(100%-24px))] rounded-[28px] border backdrop-blur-xl transition-colors md:rounded-full"
      style={{
        background: "var(--pdfx-nav-bg)",
        borderColor: "var(--pdfx-nav-border)",
        boxShadow: "0 8px 20px rgba(54, 47, 35, 0.06)",
      }}
    >
      <div className="mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:px-5">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3 group">
          <div
            className="relative flex size-10 items-center justify-center rounded-[14px] shadow-lg transition-shadow group-hover:shadow-blue-500/30"
            style={{ background: "linear-gradient(135deg, #1b96b3 0%, #2f6aa6 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 20px rgba(29,95,135,0.25)" }}
          >
            <FileText className="size-6 text-white" />
          </div>
          <span className="grid gap-0.5">
            <span className="paper-title text-xl font-bold leading-none text-foreground">
              PDF<span className="text-primary">X</span>
            </span>
            <span className="hidden text-xs leading-none text-muted-foreground sm:block">calm tools for document work</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <div ref={toolsRef} className="relative">
            <button
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground"
              onClick={() => setToolsOpen((open) => !open)}
            >
              {t.nav.tools}
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div
                className="pdfx-panel-strong absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl shadow-2xl"
              >
                <div className="p-1.5">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${cat.id}`}
                      onMouseEnter={() => void loadHomePage()}
                      onFocus={() => void loadHomePage()}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground"
                      onClick={() => setToolsOpen(false)}
                    >
                      {getCategoryLabel(cat.id, lang)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/pricing"
            onMouseEnter={() => void loadPricingPage()}
            onFocus={() => void loadPricingPage()}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isPricing
                ? "bg-white/55 text-foreground"
                : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
            )}
          >
            {t.nav.pricing}
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white/45 px-3 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-white/70 hover:text-foreground"
            aria-label={isDark ? "Switch to light mode" : "Switch to night mode"}
            title={isDark ? "Light mode" : "Night mode"}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </span>
            <span className="hidden lg:inline">{isDark ? "Light" : "Night"}</span>
          </button>

          {/* Language selector */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((open) => !open)}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/50 hover:text-foreground md:flex"
              aria-label="Change language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{currentLang.nativeName}</span>
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", langOpen && "rotate-180")} />
            </button>
            {langOpen && (
              <div
                className="pdfx-panel-strong absolute right-0 top-full z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-xl shadow-2xl"
              >
                <div className="p-1.5">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                        lang === item.code
                          ? "bg-white/55 font-medium text-foreground"
                          : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                      )}
                      onClick={() => { setLang(item.code as LangCode); setLangOpen(false); }}
                    >
                      <span className="text-base leading-none">{item.flag}</span>
                      <span>{item.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA button */}
          <Button
            className="hidden items-center gap-1.5 rounded-full border-0 bg-[#234138] px-5 text-sm font-semibold text-[#f7f3ea] shadow-[0_12px_30px_rgba(35,65,56,0.22)] hover:bg-[#31584f] dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white sm:inline-flex"
            asChild
          >
            <Link
              href="/contact"
              onMouseEnter={() => void loadContactPage()}
              onFocus={() => void loadContactPage()}
            >
              {lang === "ru" ? "Связаться" : "Contact"}
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button
            size="icon"
            variant="ghost"
          className="rounded-full text-muted-foreground hover:bg-white/55 hover:text-foreground md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="border-t border-border px-4 py-4 md:hidden"
        >
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                onMouseEnter={() => void loadHomePage()}
                onFocus={() => void loadHomePage()}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {getCategoryLabel(cat.id, lang)}
              </Link>
            ))}
            <Link
              href="/pricing"
              onMouseEnter={() => void loadPricingPage()}
              onFocus={() => void loadPricingPage()}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.pricing}
            </Link>
            <Link
              href="/contact"
              onMouseEnter={() => void loadContactPage()}
              onFocus={() => void loadContactPage()}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
              onClick={() => setMenuOpen(false)}
            >
              {lang === "ru" ? "Контакт" : "Contact"}
            </Link>
            <div className="mt-2 border-t border-border pt-2">
              <p className="premium-kicker mb-1 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {lang === "ru" ? "Язык" : "Language"}
              </p>
              <div className="grid grid-cols-2 gap-0.5">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors",
                      lang === item.code
                        ? "font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                    )}
                    onClick={() => { setLang(item.code as LangCode); setMenuOpen(false); }}
                  >
                    <span>{item.flag}</span>
                    <span>{item.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
