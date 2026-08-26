import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, FileX, Zap, Monitor, ShieldCheck, Search } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { tools, categories, getCategoryLabel } from "@/lib/tools";
import { searchToolRegistry } from "@/tools/search-index";
import type { LangCode } from "@/lib/i18n";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";

export default function Home() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeCategory = searchParams.get("category") || "all";
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");

  useSeo({
    title: lang === "ru"
      ? "PDFX — Все PDF инструменты бесплатно | Без водяных знаков"
      : "PDFX — All PDF Tools Free | No Watermarks",
    description: t.hero.sub,
    path: "/",
  });

  const isRu = lang === "ru";

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchToolRegistry(query, lang as LangCode)
      .map((result) => tools.find((tool) => tool.slug === result.entry.slug))
      .filter((tool): tool is (typeof tools)[number] => Boolean(tool));
  }, [query, lang]);

  const filteredTools =
    activeCategory === "all"
      ? tools
      : tools.filter((tool) => tool.category === activeCategory);

  const visibleTools = searchResults ?? filteredTools;

  const stats = [
    {
      value: String(tools.length),
      label: isRu ? "PDF инструментов" : "PDF tools",
    },
    {
      value: String(categories.length),
      label: isRu ? "Категории" : "Categories",
    },
    {
      value: "100%",
      label: isRu ? "Локальная обработка" : "Local processing",
    },
    {
      value: "0",
      label: isRu ? "Загрузок на сервер" : "Uploads to a server",
    },
  ];

  const features = [
    { icon: FileX, gradient: "from-yellow-500 to-orange-500", title: isRu ? "Файлы не загружаются" : "Files stay local", desc: isRu ? "Обработка локально в браузере" : "Processed in your browser" },
    { icon: Zap, gradient: "from-orange-500 to-red-500", title: isRu ? "Мгновенная обработка" : "Instant processing", desc: isRu ? "Быстрее, чем на серверах" : "Faster than server-side" },
    { icon: Monitor, gradient: "from-cyan-500 to-blue-500", title: isRu ? "Работает офлайн" : "Works offline", desc: isRu ? "Нет зависимости от сервера" : "No server required" },
    { icon: ShieldCheck, gradient: "from-pink-500 to-purple-500", title: isRu ? "Без регистрации" : "No account needed", desc: isRu ? "Анонимно и безопасно" : "Anonymous & secure" },
  ];

  const categoryList = [
    { id: "all", label: t.tools.allTools },
    ...categories.map((c) => ({ id: c.id, label: getCategoryLabel(c.id, lang) })),
  ];

  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="container mx-auto px-4 pt-20 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 mb-8"
        >
          <Sparkles className="size-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">
            {isRu ? "Вся обработка происходит в вашем браузере" : "All processing happens in your browser"}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          data-testid="text-hero-title"
        >
          <span
            className="block"
            style={{
              background: "linear-gradient(90deg, #0f172a 0%, #334155 50%, #0f172a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {isRu ? "Все PDF инструменты." : "All PDF tools."}
          </span>
          <span
            className="block"
            style={{
              background: "linear-gradient(90deg, #7c3aed 0%, #2563eb 50%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {isRu ? "Бесплатно." : "Free."}
          </span>
          <span
            className="block"
            style={{
              background: "linear-gradient(90deg, #1e293b 0%, #64748b 50%, #1e293b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {isRu ? "Без водяных знаков." : "No watermarks."}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          data-testid="text-hero-sub"
        >
          {isRu
            ? `${tools.length} мощных PDF инструментов. Объединяйте, разделяйте, сжимайте, конвертируйте и защищайте PDF — всё обрабатывается локально в вашем браузере. Ваши файлы никогда не покидают ваше устройство.`
            : `${tools.length} powerful PDF tools. Merge, split, compress, convert and protect PDFs — all processed locally in your browser. Your files never leave your device.`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/#tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white text-base transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.35)",
            }}
            data-testid="button-start-free"
          >
            {isRu ? "Выбрать инструмент" : "Pick a tool"}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-700 hover:text-slate-900 text-base border border-slate-300 hover:border-slate-400 transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.6)" }}
            data-testid="button-view-pro"
          >
            {t.hero.viewPro}
          </Link>
        </motion.div>
      </section>

      {/* ─── STATS ─── */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl p-6 text-center"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
              data-testid={`stat-${stat.label}`}
            >
              <div className="text-4xl font-bold mb-1 text-slate-900">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 tracking-wide uppercase font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group rounded-2xl p-5 transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(15,23,42,0.07)",
                }}
              >
                <div className="relative">
                  <div
                    className="inline-flex items-center justify-center size-11 rounded-xl mb-3 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${feat.gradient.includes("yellow") ? "#eab308, #f97316" : feat.gradient.includes("orange") ? "#f97316, #ef4444" : feat.gradient.includes("cyan") ? "#06b6d4, #3b82f6" : "#ec4899, #a855f7"})` }}
                  >
                    <Icon className="size-5 text-white" />
                  </div>
                  <h3 className="text-slate-900 font-semibold text-sm mb-1">{feat.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── TOOLS ─── */}
      <section id="tools" className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl font-bold mb-3 text-slate-900">
            {isRu ? "Выберите инструмент" : "Choose your tool"}
          </h2>
          <p className="text-slate-600 text-base">
            {isRu ? `${tools.length} инструментов в ${categories.length} категориях. Бесплатно, без регистрации.` : `${tools.length} tools in ${categories.length} categories. Free, no registration.`}
          </p>
        </motion.div>

        {/* Tool search */}
        <div className="max-w-xl mx-auto mb-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRu ? "Поиск инструмента…" : "Search tools…"}
            className="w-full h-11 pl-11 pr-4 rounded-xl text-sm bg-white/80 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
            aria-label={isRu ? "Поиск инструмента" : "Search tools"}
            data-testid="input-tool-search"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categoryList.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/" : `/?category=${cat.id}`}
              onClick={() => setQuery("")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
                activeCategory === cat.id && !query.trim()
                  ? "text-white shadow-lg"
                  : "text-slate-600 border border-slate-300 hover:border-slate-400 hover:text-slate-900"
              )}
              style={
                activeCategory === cat.id && !query.trim()
                  ? { background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }
                  : { background: "rgba(255,255,255,0.6)" }
              }
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Tool grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          layout
        >
          {visibleTools.map((tool, i) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              layout
            >
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </motion.div>

        {visibleTools.length === 0 && (
          <p className="text-center text-slate-500 mt-8">
            {isRu ? "Ничего не найдено. Попробуйте другой запрос." : "Nothing found. Try another search."}
          </p>
        )}
      </section>

      {/* ─── CTA ─── */}
      <section className="text-center px-4 py-20 relative">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: 400, background: "radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.08) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h2
            className="font-extrabold mb-4 text-slate-900"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.03em",
            }}
          >
            {t.cta.title}
          </h2>
          <p className="text-slate-600 mb-8 text-base">{t.cta.sub}</p>
          <Link
            href="/#tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.35)",
            }}
            data-testid="button-cta-tools"
          >
            {t.cta.btn} →
          </Link>
        </div>
      </section>
    </div>
  );
}
