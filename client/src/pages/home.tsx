import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, Flame, Search, Sparkles, Shield, Zap, CloudOff } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, getCategoryLabel, tools } from "@/lib/tools";
import { useSeo } from "@/hooks/use-seo";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const POPULAR_SLUGS = [
  "merge-pdf",
  "compress-pdf",
  "pdf-to-word",
  "split-pdf",
  "pdf-to-jpg",
  "images-to-pdf",
  "protect-pdf",
  "word-to-pdf",
];

export default function Home() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeCategory = searchParams.get("category") || "all";
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");

  useSeo({
    title:
      lang === "ru"
        ? "PDFX — Все PDF инструменты бесплатно | Без водяных знаков"
        : lang === "de"
          ? "PDFX - Kostenlose PDF-Werkzeuge | Ohne Wasserzeichen"
          : lang === "fr"
            ? "PDFX - Outils PDF gratuits | Sans filigrane"
            : lang === "es"
              ? "PDFX - Herramientas PDF gratis | Sin marcas de agua"
              : "PDFX — All PDF Tools Free | No Watermarks",
    description: t.hero.sub,
    path: "/",
  });

  const filteredTools = useMemo(() => {
    const base =
      activeCategory === "all"
        ? tools
        : tools.filter((tool) => tool.category === activeCategory);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.slug.replace(/-/g, " ").includes(q),
    );
  }, [activeCategory, query]);

  const popular = useMemo(
    () =>
      POPULAR_SLUGS.map((s) => tools.find((tool) => tool.slug === s)).filter(
        Boolean,
      ) as typeof tools,
    [],
  );

  const grouped = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        items: tools.filter((tool) => tool.category === cat.id),
      })),
    [],
  );

  const showFiltered = query.trim().length > 0 || activeCategory !== "all";

  const categoryList = [
    { id: "all", label: t.tools.allTools },
    ...categories.map((cat) => ({
      id: cat.id,
      label: getCategoryLabel(cat.id, lang),
    })),
  ];

  return (
    <div className="min-h-screen">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-8 pt-20 text-center sm:px-6 lg:pt-28">
        <div className="hero-badge mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/8 px-4 py-2 text-xs font-medium text-blue-300 backdrop-blur-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span>
            {lang === "ru"
              ? "100% в браузере — файлы не покидают устройство"
              : "100% browser-side — files never leave your device"}
          </span>
        </div>

        <h1
          className="hero-title mx-auto mb-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl"
          data-testid="text-hero-title"
        >
          {lang === "ru" ? (
            <>
              <span className="bg-gradient-to-b from-white via-white to-slate-300 bg-clip-text text-transparent">
                Все PDF инструменты
              </span>
              <br />
              <span className="hero-gradient-text bg-clip-text text-transparent">
                в одном месте
              </span>
            </>
          ) : (
            <>
              <span className="bg-gradient-to-b from-white via-white to-slate-300 bg-clip-text text-transparent">
                Every PDF tool
              </span>
              <br />
              <span className="hero-gradient-text bg-clip-text text-transparent">
                you'll ever need
              </span>
            </>
          )}
        </h1>

        <p
          className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg"
          data-testid="text-hero-sub"
        >
          {lang === "ru"
            ? `${tools.length} инструментов — бесплатно, без водяных знаков, без регистрации`
            : `${tools.length} tools — free, no watermarks, no signup required`}
        </p>

        {/* Trust badges */}
        <div className="mx-auto mb-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-emerald-400/70" />
            <span>{lang === "ru" ? "Шифрование AES-256" : "AES-256 encryption"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CloudOff className="size-3.5 text-blue-400/70" />
            <span>{lang === "ru" ? "Без загрузки на сервер" : "No server uploads"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-400/70" />
            <span>{lang === "ru" ? "Мгновенная обработка" : "Instant processing"}</span>
          </div>
        </div>

        {/* Search */}
        <div className="hero-search relative mx-auto mb-10 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500 transition-colors" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "ru" ? "Поиск инструментов..." : "Search tools..."
            }
            className="hero-search-input w-full rounded-2xl py-4 pl-12 pr-4 text-base text-white placeholder:text-slate-500 focus:outline-none"
            data-testid="input-search"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2">
          {categoryList.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/" : `/?category=${cat.id}`}
              className={cn(
                "filter-pill rounded-full border px-4 py-2 text-sm font-medium transition-all",
                activeCategory === cat.id && !query
                  ? "border-blue-400/30 bg-blue-500/15 text-white shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                  : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/16 hover:bg-white/[0.06] hover:text-white",
              )}
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── SEARCH / FILTER RESULTS ──────────────────────── */}
      {showFiltered && (
        <section className="container mx-auto px-4 py-8 sm:px-6">
          {filteredTools.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              {lang === "ru" ? "Ничего не найдено" : "No tools found"}
            </div>
          ) : (
            <>
              <p className="mb-5 text-sm text-slate-400">
                {filteredTools.length}{" "}
                {lang === "ru" ? "инструментов" : "tools"}
                {query.trim() && (
                  <>
                    {" "}
                    {lang === "ru" ? "по запросу" : "for"}{" "}
                    <span className="text-white">«{query}»</span>
                  </>
                )}
              </p>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── MAIN CONTENT (no search, all category) ───────── */}
      {!showFiltered && (
        <>
          {/* Popular */}
          <RevealSection className="container mx-auto px-4 pb-8 pt-10 sm:px-6">
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/15">
                <Flame className="size-4 text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {lang === "ru" ? "Популярные инструменты" : "Popular tools"}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {popular.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </RevealSection>

          {/* Divider */}
          <div className="container mx-auto px-4 sm:px-6">
            <div className="section-divider" />
          </div>

          {/* Grouped by category */}
          {grouped.map((cat) => (
            <RevealSection
              key={cat.id}
              id="tools"
              className="container mx-auto px-4 py-10 sm:px-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-semibold text-white">
                    {getCategoryLabel(cat.id, lang)}
                  </h2>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    {cat.items.length}
                  </span>
                </div>
                <Link
                  href={`/?category=${cat.id}`}
                  className="group/link flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-white"
                >
                  {lang === "ru" ? "Все" : "See all"}
                  <ArrowRight className="size-3 transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                {cat.items.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </RevealSection>
          ))}
        </>
      )}

      {/* ── AI PROMO ─────────────────────────────────────── */}
      <RevealSection className="container mx-auto px-4 pb-24 pt-4 sm:px-6">
        <div className="ai-promo-card relative overflow-hidden rounded-[2rem]">
          {/* Mesh gradient background */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute -left-20 -top-20 size-80 rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-10 -right-10 size-60 rounded-full opacity-25 blur-3xl"
              style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
            />
            <div
              className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)" }}
            />
          </div>

          <div className="relative px-8 py-12 md:px-12 md:py-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-fuchsia-300 backdrop-blur-sm">
              <Sparkles className="size-3.5" />
              AI
            </div>
            <h2 className="mb-4 max-w-lg text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
              {lang === "ru" ? "AI-функции для документов" : "AI features for documents"}
            </h2>
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-slate-300/70 sm:text-base">
              {lang === "ru"
                ? "OCR, извлечение текста и будущие AI-сценарии загружают тяжёлые модули только там, где они действительно нужны."
                : "OCR, text extraction, and future AI workflows load heavy modules only where they are actually needed."}
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">OCR</span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
                {lang === "ru" ? "Извлечение текста" : "Text extraction"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300">
                {lang === "ru" ? "Умное сжатие" : "Smart compression"}
              </span>
            </div>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
