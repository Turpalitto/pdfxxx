import { Link, useLocation } from "wouter";
import { Menu, X, FileText, ChevronDown, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useState, useRef, useEffect } from "react";
import { categories } from "@/lib/tools";
import { getCategoryLabel } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function Navbar() {
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
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(13,15,30,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[58px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg transition-shadow group-hover:shadow-primary/50"
            style={{ background: "linear-gradient(135deg, #4f8ef7, #6c5ce7)", boxShadow: "0 2px 10px rgba(108,92,231,0.4)" }}
          >
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">
            PDF<span style={{ color: "#6c5ce7" }}>X</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <div ref={toolsRef} className="relative">
            <button
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              data-testid="nav-tools"
              onClick={() => setToolsOpen((v) => !v)}
            >
              {t.nav.tools}
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-56 rounded-xl z-50 overflow-hidden"
                style={{ background: "rgba(15,17,35,0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
              >
                <div className="p-1.5">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${cat.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-foreground/80 hover:text-foreground hover:bg-white/6 transition-colors"
                      onClick={() => setToolsOpen(false)}
                      data-testid={`nav-category-${cat.id}`}
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
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
              location === "/pricing"
                ? "text-foreground bg-white/6"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            data-testid="nav-pricing"
          >
            {lang === "ru" ? "Возможности" : lang === "de" ? "Preise" : lang === "fr" ? "Tarifs" : lang === "es" ? "Precios" : lang === "zh" ? "价格" : lang === "ja" ? "料金" : "Features"}
          </Link>

          <Link
            href="/#ai-section"
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors flex items-center gap-1.5"
            data-testid="nav-ai"
          >
            <Sparkles className="w-3 h-3" style={{ color: "#a78bfa" }} />
            AI
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              aria-label="Change language"
              data-testid="button-lang-toggle"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-medium">{currentLang.nativeName}</span>
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", langOpen && "rotate-180")} />
            </button>
            {langOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-52 max-h-72 overflow-y-auto rounded-xl z-50"
                style={{ background: "rgba(15,17,35,0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
              >
                <div className="p-1.5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left transition-colors",
                        lang === l.code
                          ? "text-white font-medium"
                          : "text-foreground/70 hover:text-foreground hover:bg-white/6"
                      )}
                      style={lang === l.code ? { background: "rgba(108,92,231,0.2)" } : undefined}
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

          {/* Pro button */}
          <Link
            href="/pricing"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #6c5ce7 0%, #8b5cf6 50%, #a855f7 100%)",
              boxShadow: "0 2px 16px rgba(108,92,231,0.45)",
            }}
            data-testid="button-get-pro"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {lang === "ru" ? "Купить Pro" : lang === "de" ? "Pro kaufen" : lang === "fr" ? "Acheter Pro" : lang === "es" ? "Comprar Pro" : lang === "zh" ? "购买Pro" : lang === "ja" ? "Proを購入" : "Get Pro"}
          </Link>

          {/* Mobile menu button */}
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

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-5 py-3"
          style={{ background: "rgba(13,15,30,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {getCategoryLabel(cat.id, lang)}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {lang === "ru" ? "Возможности" : "Features"}
            </Link>
            <div className="border-t mt-2 pt-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <p className="px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                {lang === "ru" ? "Язык" : "Language"}
              </p>
              <div className="grid grid-cols-2 gap-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition-colors",
                      lang === l.code ? "text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                    style={lang === l.code ? { background: "rgba(108,92,231,0.2)" } : undefined}
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
