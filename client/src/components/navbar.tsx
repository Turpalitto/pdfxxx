import { Link, useLocation } from "wouter";
import { Sun, Moon, Menu, X, FileText, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useState, useRef, useEffect } from "react";
import { categories } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [location] = useLocation();
  const langRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/75 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-md shadow-primary/40 group-hover:shadow-primary/60 transition-shadow">
            <FileText className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">
            PDF<span className="text-primary">X</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          <div ref={toolsRef} className="relative">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              data-testid="nav-tools"
              onClick={() => setToolsOpen((v) => !v)}
            >
              {t.nav.tools}
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-52 rounded-md border border-border bg-popover/95 backdrop-blur-xl shadow-xl z-50">
                <div className="p-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${cat.id}`}
                      className="block px-3 py-2 text-sm rounded-sm text-popover-foreground hover:bg-accent/70 transition-colors"
                      onClick={() => setToolsOpen(false)}
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/pricing"
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              location === "/pricing"
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
            data-testid="nav-pricing"
          >
            {t.nav.pricing}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              aria-label="Change language"
              data-testid="button-lang-toggle"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-medium">{currentLang.nativeName}</span>
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", langOpen && "rotate-180")} />
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-52 max-h-72 overflow-y-auto rounded-md border border-border bg-popover/95 backdrop-blur-xl shadow-xl z-50">
                <div className="p-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-sm text-left transition-colors",
                        lang === l.code
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-popover-foreground hover:bg-accent/70"
                      )}
                      onClick={() => {
                        setLang(l.code as LangCode);
                        setLangOpen(false);
                      }}
                      data-testid={`lang-option-${l.code}`}
                    >
                      <span className="text-base leading-none">{l.flag}</span>
                      <span>{l.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            className="hidden sm:flex shadow-md shadow-primary/25 text-xs"
            data-testid="button-get-pro"
            asChild
          >
            <Link href="/pricing">{t.nav.getPro}</Link>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-2xl px-4 py-3">
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {cat.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.pricing}
            </Link>
            <div className="border-t border-border/40 mt-2 pt-2">
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">Language</p>
              <div className="grid grid-cols-2 gap-0.5 mt-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs rounded-md text-left transition-colors",
                      lang === l.code ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                    onClick={() => { setLang(l.code as LangCode); setMenuOpen(false); }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
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
