import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText, ChevronDown, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { categories, getCategoryLabel } from "@/lib/tools";
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

  const currentLang = LANGUAGES.find((item) => item.code === lang) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div
            className="relative flex size-9 items-center justify-center rounded-xl shadow-lg transition-shadow group-hover:shadow-blue-500/60"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)", boxShadow: "0 4px 14px rgba(99,102,241,0.5)" }}
          >
            <FileText className="size-5 text-white" />
            <div className="absolute -top-1 -right-1 flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
            </div>
          </div>
          <span
            className="text-lg font-bold"
            style={{
              background: "linear-gradient(90deg, #ffffff 0%, #bfdbfe 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            PDF<span style={{ color: "#60a5fa", WebkitTextFillColor: "#60a5fa" }}>X</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <div ref={toolsRef} className="relative">
            <button
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              data-testid="nav-tools"
              onClick={() => setToolsOpen((open) => !open)}
            >
              {t.nav.tools}
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-56 rounded-xl z-50 overflow-hidden"
                style={{
                  background: "rgba(2,6,23,0.97)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                }}
              >
                <div className="p-1.5">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${cat.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-slate-300 hover:text-white hover:bg-white/6 transition-colors"
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
              "px-3.5 py-1.5 rounded-lg text-sm transition-colors",
              location === "/pricing"
                ? "text-white bg-white/6 font-medium"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
            data-testid="nav-pricing"
          >
            {t.nav.pricing}
          </Link>

        </nav>

        <div className="flex items-center gap-2">
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((open) => !open)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Change language"
              data-testid="button-lang-toggle"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{currentLang.nativeName}</span>
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", langOpen && "rotate-180")} />
            </button>
            {langOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-52 max-h-72 overflow-y-auto rounded-xl z-50"
                style={{
                  background: "rgba(2,6,23,0.97)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                }}
              >
                <div className="p-1.5">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left transition-colors",
                        lang === item.code
                          ? "text-white font-medium"
                          : "text-slate-300 hover:text-white hover:bg-white/6"
                      )}
                      style={lang === item.code ? { background: "rgba(99,102,241,0.2)" } : undefined}
                      onClick={() => {
                        setLang(item.code as LangCode);
                        setLangOpen(false);
                      }}
                      data-testid={`lang-option-${item.code}`}
                    >
                      <span className="text-base leading-none">{item.flag}</span>
                      <span>{item.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            className="hidden sm:inline-flex items-center gap-1.5 text-white text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            }}
            data-testid="button-get-pro"
            asChild
          >
            <Link href="/contact">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === "ru" ? "Связаться" : "Contact"}
            </Link>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden px-4 py-3"
          style={{ background: "rgba(2,6,23,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {getCategoryLabel(cat.id, lang)}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.pricing}
            </Link>
            <Link
              href="/contact"
              className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {lang === "ru" ? "Контакт" : "Contact"}
            </Link>
            <div className="border-t mt-2 pt-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <p className="px-3 py-1 text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                {lang === "ru" ? "Язык" : "Language"}
              </p>
              <div className="grid grid-cols-2 gap-0.5">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition-colors",
                      lang === item.code ? "text-white font-medium" : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                    style={lang === item.code ? { background: "rgba(99,102,241,0.2)" } : undefined}
                    onClick={() => {
                      setLang(item.code as LangCode);
                      setMenuOpen(false);
                    }}
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
