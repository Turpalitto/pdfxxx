import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText, ChevronDown, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES, type LangCode } from "@/lib/languages";
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
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find((entry) => entry.code === lang) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <div
            className="relative flex size-9 items-center justify-center rounded-xl shadow-lg transition-all duration-500 ease-out group-hover:-translate-y-0.5 group-hover:shadow-blue-500/60"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)",
              boxShadow: "0 4px 14px rgba(99,102,241,0.5)",
            }}
          >
            <FileText className="size-5 text-white" />
            <div className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
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

        <nav className="hidden items-center gap-1 md:flex">
          <div ref={toolsRef} className="relative">
            <button
              className="flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              data-testid="nav-tools"
              onClick={() => setToolsOpen((value) => !value)}
            >
              {t.nav.tools}
              <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", toolsOpen && "rotate-180")} />
            </button>

            {toolsOpen && (
              <div
                className="gpu-layer animate-in fade-in zoom-in-95 absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl duration-200"
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
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/6 hover:text-white"
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
              "rounded-lg px-3.5 py-1.5 text-sm transition-colors",
              location === "/pricing"
                ? "bg-white/6 font-medium text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            )}
            data-testid="nav-pricing"
          >
            {t.nav.pricing}
          </Link>

          <Link
            href="/#ai-section"
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            data-testid="nav-ai"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            AI
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((value) => !value)}
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white md:flex"
              aria-label="Change language"
              data-testid="button-lang-toggle"
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">{currentLang.nativeName}</span>
              <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", langOpen && "rotate-180")} />
            </button>

            {langOpen && (
              <div
                className="gpu-layer animate-in fade-in zoom-in-95 absolute right-0 top-full z-50 mt-2 max-h-72 w-52 overflow-y-auto rounded-xl duration-200"
                style={{
                  background: "rgba(2,6,23,0.97)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                }}
              >
                <div className="p-1.5">
                  {LANGUAGES.map((entry) => (
                    <button
                      key={entry.code}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        lang === entry.code
                          ? "font-medium text-white"
                          : "text-slate-300 hover:bg-white/6 hover:text-white"
                      )}
                      style={lang === entry.code ? { background: "rgba(99,102,241,0.2)" } : undefined}
                      onClick={() => {
                        setLang(entry.code as LangCode);
                        setLangOpen(false);
                      }}
                      data-testid={`lang-option-${entry.code}`}
                    >
                      <span className="text-xs font-semibold leading-none text-slate-400">{entry.flag}</span>
                      <span>{entry.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            className="motion-button hidden items-center gap-1.5 text-sm font-semibold text-white hover:opacity-95 sm:inline-flex"
            style={{
              background: "#6c5ce7",
              borderRadius: "10px",
              padding: "8px 20px",
              fontWeight: 600,
            }}
            data-testid="button-get-pro"
            asChild
          >
            <Link href="/pricing">
              <Sparkles className="h-3.5 w-3.5" />
              {t.nav.getPro}
            </Link>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="text-slate-300 hover:text-white md:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="animate-in slide-in-from-top-2 overflow-hidden duration-200 md:hidden">
          <div
            className="px-4 py-3"
            style={{
              background: "rgba(2,6,23,0.97)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <nav className="flex flex-col gap-0.5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/?category=${cat.id}`}
                  className="rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {getCategoryLabel(cat.id, lang)}
                </Link>
              ))}

              <Link
                href="/pricing"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {t.nav.pricing}
              </Link>

              <div className="mt-2 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="mb-1 px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                  {lang === "ru" ? "\u042f\u0437\u044b\u043a" : "Language"}
                </p>
                <div className="grid grid-cols-2 gap-0.5">
                  {LANGUAGES.map((entry) => (
                    <button
                      key={entry.code}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                        lang === entry.code
                          ? "font-medium text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                      style={lang === entry.code ? { background: "rgba(99,102,241,0.2)" } : undefined}
                      onClick={() => {
                        setLang(entry.code as LangCode);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="font-semibold text-slate-400">{entry.flag}</span>
                      <span>{entry.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
