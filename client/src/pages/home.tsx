import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, Flame, Search, Sparkles } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, getCategoryLabel, tools } from "@/lib/tools";
import { useSeo } from "@/hooks/use-seo";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

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
      <section className="container mx-auto px-4 pb-6 pt-20 text-center sm:px-6 lg:pt-28">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/8 px-4 py-1.5 text-xs font-medium text-blue-300">
          <Sparkles className="size-3.5" />
          <span>
            {lang === "ru"
              ? "100% в браузере — файлы не покидают устройство"
              : "100% browser-side — files never leave your device"}
          </span>
        </div>

        <h1
          className="mx-auto mb-4 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-5xl"
          data-testid="text-hero-title"
        >
          {lang === "ru" ? (
            <>
              <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                Все PDF инструменты
              </span>{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                в одном месте
              </span>
            </>
          ) : (
            <>
              <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                Every PDF tool
              </span>{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                you'll ever need
              </span>
            </>
          )}
        </h1>

        <p
          className="mx-auto mb-8 max-w-xl text-base text-slate-400 sm:text-lg"
          data-testid="text-hero-sub"
        >
          {lang === "ru"
            ? `${tools.length} инструментов — бесплатно, без водяных знаков, без регистрации`
            : `${tools.length} tools — free, no watermarks, no signup required`}
        </p>

        {/* Search */}
        <div className="relative mx-auto mb-8 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "ru" ? "Поиск инструментов..." : "Search tools..."
            }
            className="w-full rounded-2xl py-3.5 pl-12 pr-4 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            style={{
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
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
                "filter-pill rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                activeCategory === cat.id && !query
                  ? "border-blue-400/40 bg-blue-500/15 text-white"
                  : "border-white/8 bg-slate-950/45 text-slate-300 hover:border-white/16 hover:text-white",
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
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
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
          <section className="container mx-auto px-4 pb-6 pt-8 sm:px-6">
            <div className="mb-5 flex items-center gap-2">
              <Flame className="size-5 text-orange-400" />
              <h2 className="text-base font-semibold text-white">
                {lang === "ru" ? "Популярные инструменты" : "Popular tools"}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {popular.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="container mx-auto px-4 sm:px-6">
            <div className="border-t border-white/6" />
          </div>

          {/* Grouped by category */}
          {grouped.map((cat) => (
            <section
              key={cat.id}
              id="tools"
              className="container mx-auto px-4 py-8 sm:px-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-white">
                    {getCategoryLabel(cat.id, lang)}
                  </h2>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">
                    {cat.items.length}
                  </span>
                </div>
                <Link
                  href={`/?category=${cat.id}`}
                  className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white"
                >
                  {lang === "ru" ? "Все" : "See all"}
                  <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {cat.items.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {/* ── AI PROMO ─────────────────────────────────────── */}
      <section className="container mx-auto px-4 pb-24 pt-4 sm:px-6">
        <div
          className="overflow-hidden rounded-[2rem]"
          style={{
            background:
              "linear-gradient(135deg,rgba(8,15,36,0.92),rgba(21,34,67,0.88))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="px-6 py-10 md:px-10 md:py-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
              <Sparkles className="size-3.5" />
              AI
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
              {lang === "ru" ? "AI-функции для документов" : "AI features for documents"}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              {lang === "ru"
                ? "OCR, извлечение текста и будущие AI-сценарии загружают тяжёлые модули только там, где они действительно нужны."
                : "OCR, text extraction, and future AI workflows load heavy modules only where they are actually needed."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
