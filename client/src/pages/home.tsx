import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import {
  ArrowRight,
  Flame,
  Search,
  Sparkles,
  Shield,
  Zap,
  CloudOff,
  FileText,
  Lock,
  Layers,
} from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, getCategoryLabel, tools } from "@/lib/tools";
import { useSeo } from "@/hooks/use-seo";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

/* ─── Scroll reveal hook ─────────────────────────────────────── */
function useScrollReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -32px 0px" },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return { ref, visible };
}

function RevealSection({
  children,
  className,
  delay = 0,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  const { ref, visible } = useScrollReveal(delay);
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Stats bar ──────────────────────────────────────────────── */
const STATS = (lang: string) => [
  { value: "50+", label: lang === "ru" ? "Инструментов" : "PDF Tools" },
  { value: "100%", label: lang === "ru" ? "В браузере" : "Browser-based" },
  { value: "0", label: lang === "ru" ? "Загрузок на сервер" : "Server uploads" },
  { value: "∞", label: lang === "ru" ? "Бесплатно" : "Always free" },
];

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

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative container mx-auto px-4 pb-12 pt-20 text-center sm:px-6 lg:pt-32">

        {/* Badge */}
        <div className="hero-entrance mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-2 text-xs font-medium text-slate-300 backdrop-blur-md">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="tracking-wide">
            {lang === "ru"
              ? "Всё работает в браузере — ваши файлы приватны"
              : "Everything runs in your browser — your files stay private"}
          </span>
        </div>

        {/* Heading */}
        <h1
          className="hero-entrance hero-title mx-auto mb-6 max-w-4xl"
          data-testid="text-hero-title"
          style={{ animationDelay: "60ms" }}
        >
          {lang === "ru" ? (
            <>
              <span className="hero-title-main">Все PDF инструменты</span>
              <br />
              <span className="hero-title-accent">в одном месте</span>
            </>
          ) : (
            <>
              <span className="hero-title-main">Every PDF tool</span>
              <br />
              <span className="hero-title-accent">you'll ever need</span>
            </>
          )}
        </h1>

        {/* Sub */}
        <p
          className="hero-entrance mx-auto mb-10 max-w-lg text-lg leading-relaxed text-slate-400"
          data-testid="text-hero-sub"
          style={{ animationDelay: "120ms" }}
        >
          {lang === "ru"
            ? `${tools.length} инструментов — бесплатно, без водяных знаков, без регистрации`
            : `${tools.length} tools — free, no watermarks, no signup required`}
        </p>

        {/* Search */}
        <div
          className="hero-entrance hero-search relative mx-auto mb-8 max-w-2xl"
          style={{ animationDelay: "160ms" }}
        >
          <Search className="hero-search-icon pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "ru" ? "Поиск инструментов..." : "Search tools..."
            }
            className="hero-search-input w-full rounded-2xl py-5 pl-14 pr-32 text-base text-white placeholder:text-slate-500 focus:outline-none"
            data-testid="input-search"
          />
          <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-slate-500">⌘</kbd>
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-slate-500">K</kbd>
          </div>
        </div>

        {/* Category pills */}
        <div
          className="hero-entrance flex flex-wrap justify-center gap-2"
          style={{ animationDelay: "200ms" }}
        >
          {categoryList.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/" : `/?category=${cat.id}`}
              className={cn(
                "filter-pill rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                activeCategory === cat.id && !query
                  ? "border-blue-400/30 bg-blue-500/12 text-white shadow-[0_0_20px_rgba(59,130,246,0.12)]"
                  : "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-slate-200",
              )}
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── TRUST + STATS STRIP ───────────────────────────────── */}
      {!showFiltered && (
        <div className="container mx-auto px-4 pb-8 sm:px-6">
          <div className="stats-strip">
            {STATS(lang).map((stat, i) => (
              <div key={i} className="stats-strip-item">
                <span className="stats-number">{stat.value}</span>
                <span className="stats-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH / FILTER RESULTS ───────────────────────────── */}
      {showFiltered && (
        <section className="container mx-auto px-4 py-10 sm:px-6">
          {filteredTools.length === 0 ? (
            <div className="py-24 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
                <Search className="size-7 text-slate-600" />
              </div>
              <p className="text-slate-400">
                {lang === "ru" ? "Ничего не найдено" : "No tools found"}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-slate-500">
                {filteredTools.length}{" "}
                {lang === "ru" ? "инструментов" : "tools"}
                {query.trim() && (
                  <>
                    {" "}
                    {lang === "ru" ? "по запросу" : "for"}{" "}
                    <span className="font-medium text-white">«{query}»</span>
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

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      {!showFiltered && (
        <>
          {/* Popular */}
          <RevealSection className="container mx-auto px-4 pb-10 pt-4 sm:px-6">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="section-header-icon bg-orange-500/12">
                  <Flame className="size-4 text-orange-400" />
                </div>
                <div>
                  <p className="section-eyebrow">
                    {lang === "ru" ? "ТОП" : "TRENDING"}
                  </p>
                  <h2 className="section-title">
                    {lang === "ru" ? "Популярные инструменты" : "Popular tools"}
                  </h2>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {popular.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </RevealSection>

          {/* Gradient divider */}
          <div className="container mx-auto px-4 sm:px-6">
            <div className="section-divider" />
          </div>

          {/* Grouped by category */}
          {grouped.map((cat, idx) => (
            <RevealSection
              key={cat.id}
              id="tools"
              className="container mx-auto px-4 py-10 sm:px-6"
              delay={idx * 30}
            >
              <div className="section-header">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="section-title">
                      {getCategoryLabel(cat.id, lang)}
                    </h2>
                  </div>
                  <span className="section-count">{cat.items.length}</span>
                </div>
                <Link
                  href={`/?category=${cat.id}`}
                  className="group/link flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-all hover:text-slate-200"
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

      {/* ── WHY PDFX ─────────────────────────────────────────── */}
      {!showFiltered && (
        <RevealSection className="container mx-auto px-4 pb-10 sm:px-6">
          <div className="gradient-divider-line" />
          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon-wrap" style={{ background: "rgba(59,130,246,0.12)" }}>
                <CloudOff className="size-5 text-blue-400" />
              </div>
              <h3 className="why-title">
                {lang === "ru" ? "Полная приватность" : "100% Private"}
              </h3>
              <p className="why-desc">
                {lang === "ru"
                  ? "Файлы обрабатываются прямо в браузере. Ни один файл не покидает ваше устройство."
                  : "Files are processed entirely in your browser. Nothing ever leaves your device."}
              </p>
            </div>
            <div className="why-card">
              <div className="why-icon-wrap" style={{ background: "rgba(16,185,129,0.12)" }}>
                <Zap className="size-5 text-emerald-400" />
              </div>
              <h3 className="why-title">
                {lang === "ru" ? "Мгновенно" : "Lightning Fast"}
              </h3>
              <p className="why-desc">
                {lang === "ru"
                  ? "Нативная обработка WebAssembly. Никаких задержек загрузки — всё моментально."
                  : "Native WebAssembly processing. No upload delays — everything is instant."}
              </p>
            </div>
            <div className="why-card">
              <div className="why-icon-wrap" style={{ background: "rgba(245,158,11,0.12)" }}>
                <Shield className="size-5 text-amber-400" />
              </div>
              <h3 className="why-title">
                {lang === "ru" ? "Без ограничений" : "No Restrictions"}
              </h3>
              <p className="why-desc">
                {lang === "ru"
                  ? "Никаких водяных знаков, никакой регистрации, никаких платежей. Все инструменты — бесплатно."
                  : "No watermarks, no signup, no payment. Every tool is completely free to use."}
              </p>
            </div>
          </div>
        </RevealSection>
      )}

      {/* ── AI PROMO ─────────────────────────────────────────── */}
      <RevealSection className="container mx-auto px-4 pb-28 pt-2 sm:px-6">
        <div className="ai-promo-card relative overflow-hidden rounded-[2.5rem]">
          {/* Mesh blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="ai-blob" style={{ left: "-8%", top: "-30%", width: "28rem", height: "28rem", background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 65%)" }} />
            <div className="ai-blob" style={{ right: "-5%", bottom: "-20%", width: "22rem", height: "22rem", background: "radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 65%)" }} />
            <div className="ai-blob" style={{ left: "42%", top: "30%", width: "16rem", height: "16rem", background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)" }} />
          </div>

          {/* Subtle grid inside card */}
          <div className="pointer-events-none absolute inset-0 ai-card-grid" />

          <div className="relative grid gap-8 px-8 py-14 md:grid-cols-2 md:px-14 md:py-16 lg:py-20">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-fuchsia-300">
                <Sparkles className="size-3.5" />
                AI
              </div>
              <h2 className="mb-4 text-3xl font-bold leading-tight text-white lg:text-4xl">
                {lang === "ru"
                  ? "AI-функции для документов"
                  : "AI features for\ndocuments"}
              </h2>
              <p className="mb-8 text-base leading-relaxed text-slate-400">
                {lang === "ru"
                  ? "OCR, извлечение текста и будущие AI-сценарии загружают тяжёлые модули только там, где они нужны."
                  : "OCR, text extraction, and future AI workflows load heavy modules only where actually needed."}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {["OCR", lang === "ru" ? "Извлечение текста" : "Text extraction", lang === "ru" ? "Умное сжатие" : "Smart compression", lang === "ru" ? "Авто-разметка" : "Auto-layout"].map((tag) => (
                  <span key={tag} className="ai-tag">{tag}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="ai-visual-grid">
                {[
                  { icon: FileText, label: "PDF → Text", color: "#3b82f6" },
                  { icon: Layers, label: "OCR Scan", color: "#8b5cf6" },
                  { icon: Zap, label: lang === "ru" ? "Сжатие" : "Compress", color: "#10b981" },
                  { icon: Lock, label: lang === "ru" ? "Защита" : "Protect", color: "#f59e0b" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="ai-visual-item">
                    <div className="ai-visual-icon" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                      <Icon className="size-5" style={{ color }} />
                    </div>
                    <span className="ai-visual-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
