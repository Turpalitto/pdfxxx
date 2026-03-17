import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, FileText, ChevronDown, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/lang-context";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { categories, getCategoryLabel } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { loadContactPage, loadHomePage, loadPricingPage } from "@/lib/route-preload";

export function Navbar() {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [location] = useLocation();
  const langRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const isHome = location === "/" || location === "";
  const isPricing = (location as string) === "/pricing";

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
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors",
        isHome
          ? "bg-white/90 backdrop-blur-md border-gray-200"
          : "bg-slate-950/80 backdrop-blur-xl border-white/10"
      )}
    >
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div
            className="relative flex size-10 items-center justify-center rounded-xl shadow-lg transition-shadow group-hover:shadow-blue-500/40"
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)", boxShadow: "0 4px 14px rgba(14,165,233,0.35)" }}
          >
            <FileText className="size-6 text-white" />
          </div>
          <span
            className={cn("text-xl font-bold", isHome ? "text-gray-900" : "text-white")}
          >
            PDF<span className="text-sky-600">X</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <div ref={toolsRef} className="relative">
            <button
              className={cn(
                "flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-sm transition-colors",
                isHome
                  ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
              onClick={() => setToolsOpen((open) => !open)}
            >
              {t.nav.tools}
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div
                className={cn(
                  "absolute top-full left-0 mt-2 w-56 rounded-xl z-50 overflow-hidden shadow-xl",
                  isHome ? "bg-white border border-gray-200" : "border border-white/10"
                )}
                style={!isHome ? { background: "rgba(2,6,23,0.97)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" } : undefined}
              >
                <div className="p-1.5">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${cat.id}`}
                      onMouseEnter={() => void loadHomePage()}
                      onFocus={() => void loadHomePage()}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors",
                        isHome
                          ? "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          : "text-slate-300 hover:text-white hover:bg-white/6"
                      )}
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
              "px-3.5 py-1.5 rounded-lg text-sm transition-colors",
              isHome
                ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                : (isPricing ? "text-white bg-white/6 font-medium" : "text-slate-300 hover:text-white hover:bg-white/5")
            )}
          >
            {t.nav.pricing}
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((open) => !open)}
              className={cn(
                "hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors",
                isHome
                  ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
              aria-label="Change language"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{currentLang.nativeName}</span>
              <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", langOpen && "rotate-180")} />
            </button>
            {langOpen && (
              <div
                className={cn(
                  "absolute top-full right-0 mt-2 w-52 max-h-72 overflow-y-auto rounded-xl z-50 shadow-xl",
                  isHome ? "bg-white border border-gray-200" : "border border-white/10"
                )}
                style={!isHome ? { background: "rgba(2,6,23,0.97)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" } : undefined}
              >
                <div className="p-1.5">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-left transition-colors",
                        isHome
                          ? (lang === item.code ? "text-gray-900 font-medium bg-blue-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50")
                          : (lang === item.code ? "text-white font-medium" : "text-slate-300 hover:text-white hover:bg-white/6")
                      )}
                      style={(!isHome && lang === item.code) ? { background: "rgba(99,102,241,0.2)" } : undefined}
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
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold",
              isHome
                ? "bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white border-0"
                : "text-white"
            )}
            style={!isHome ? { background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)", boxShadow: "0 4px 16px rgba(20,184,166,0.28)" } : undefined}
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
            className={cn("md:hidden", isHome ? "text-gray-600 hover:text-gray-900" : "text-slate-300 hover:text-white")}
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
          className={cn("md:hidden px-4 py-3 border-t", isHome ? "bg-white border-gray-200" : "border-white/7")}
          style={!isHome ? { background: "rgba(2,6,23,0.97)" } : undefined}
        >
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                onMouseEnter={() => void loadHomePage()}
                onFocus={() => void loadHomePage()}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm transition-colors",
                  isHome ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-slate-300 hover:text-white hover:bg-white/5"
                )}
                onClick={() => setMenuOpen(false)}
              >
                {getCategoryLabel(cat.id, lang)}
              </Link>
            ))}
            <Link
              href="/pricing"
              onMouseEnter={() => void loadPricingPage()}
              onFocus={() => void loadPricingPage()}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition-colors",
                isHome ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
              onClick={() => setMenuOpen(false)}
            >
              {t.nav.pricing}
            </Link>
            <Link
              href="/contact"
              onMouseEnter={() => void loadContactPage()}
              onFocus={() => void loadContactPage()}
              className={cn(
                "px-3 py-2 rounded-lg text-sm transition-colors",
                isHome ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
              onClick={() => setMenuOpen(false)}
            >
              {lang === "ru" ? "Контакт" : "Contact"}
            </Link>
            <div className={cn("border-t mt-2 pt-2", isHome ? "border-gray-200" : "border-white/7")}>
              <p className={cn("px-3 py-1 text-xs font-medium uppercase tracking-wider mb-1", isHome ? "text-gray-400" : "text-slate-400")}>
                {lang === "ru" ? "Язык" : "Language"}
              </p>
              <div className="grid grid-cols-2 gap-0.5">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition-colors",
                      isHome
                        ? (lang === item.code ? "text-blue-600 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")
                        : (lang === item.code ? "text-white font-medium" : "text-slate-300 hover:text-white hover:bg-white/5")
                    )}
                    style={(!isHome && lang === item.code) ? { background: "rgba(99,102,241,0.2)" } : undefined}
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
