import { useSearch } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, FileX, Zap, Monitor, ShieldCheck } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { tools, categories, getCategoryLabel } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";

export default function Home() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeCategory = searchParams.get("category") || "all";
  const { t, lang } = useLang();

  useSeo({
    title: lang === "ru"
      ? "PDFX — Все PDF инструменты бесплатно | Без водяных знаков"
      : lang === "de"
      ? "PDFX — Kostenlose PDF-Werkzeuge | Ohne Wasserzeichen"
      : lang === "fr"
      ? "PDFX — Outils PDF gratuits | Sans filigrane"
      : lang === "es"
      ? "PDFX — Herramientas PDF gratis | Sin marcas de agua"
      : lang === "zh"
      ? "PDFX — 免费PDF工具 | 无水印"
      : lang === "ja"
      ? "PDFX — 無料PDFツール | 透かしなし"
      : lang === "ar"
      ? "PDFX — أدوات PDF مجانية | بدون علامة مائية"
      : "PDFX — All PDF Tools Free | No Watermarks",
    description: t.hero.sub,
    path: "/",
  });

  const filteredTools =
    activeCategory === "all"
      ? tools
      : tools.filter((tool) => tool.category === activeCategory);

  const stats = [
    { value: "2M+", label: lang === "ru" ? "Файлов обработано" : "Files processed", gradient: "from-purple-400 to-pink-400" },
    { value: "180+", label: lang === "ru" ? "Стран" : "Countries", gradient: "from-blue-400 to-cyan-400" },
    { value: "28", label: lang === "ru" ? "PDF инструментов" : "PDF tools", gradient: "from-emerald-400 to-green-400" },
    { value: "100%", label: lang === "ru" ? "Бесплатно" : "Free to start", gradient: "from-yellow-400 to-orange-400" },
  ];

  const features = [
    { icon: FileX, gradient: "from-yellow-500 to-orange-500", title: lang === "ru" ? "Локальная обработка" : "Files stay local", desc: lang === "ru" ? "В вашем браузере" : "In your browser" },
    { icon: Zap, gradient: "from-orange-500 to-red-500", title: lang === "ru" ? "Мгновенно" : "Instant", desc: lang === "ru" ? "Быстрее серверов" : "Faster than servers" },
    { icon: Monitor, gradient: "from-cyan-500 to-blue-500", title: lang === "ru" ? "Офлайн" : "Offline", desc: lang === "ru" ? "Без сервера" : "No server" },
    { icon: ShieldCheck, gradient: "from-pink-500 to-purple-500", title: lang === "ru" ? "Без регистрации" : "No account", desc: lang === "ru" ? "Анонимно" : "Anonymous" },
  ];

  const categoryList = [
    { id: "all", label: t.tools.allTools },
    ...categories.map((c) => ({ id: c.id, label: getCategoryLabel(c.id, lang) })),
  ];

  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="container mx-auto px-4 pt-[120px] pb-[60px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 mb-8"
        >
          <Sparkles className="size-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">
            {lang === "ru" ? "Обработка в вашем браузере" : "Processing in your browser"}
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
              background: "linear-gradient(90deg, #ffffff 0%, #bfdbfe 50%, #ffffff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {lang === "ru" ? "Все PDF инструменты." : lang === "de" ? "Alle PDF-Werkzeuge." : lang === "fr" ? "Tous les outils PDF." : lang === "es" ? "Todas las herramientas PDF." : lang === "zh" ? "所有PDF工具。" : lang === "ja" ? "すべてのPDFツール。" : "All PDF tools."}
          </span>
          <span
            className="block"
            style={{
              background: "linear-gradient(90deg, #a78bfa 0%, #60a5fa 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {lang === "ru" ? "Бесплатно." : lang === "de" ? "Kostenlos." : lang === "fr" ? "Gratuit." : lang === "es" ? "Gratis." : lang === "zh" ? "免费。" : lang === "ja" ? "無料で。" : "Free."}
          </span>
          <span
            className="block"
            style={{
              background: "linear-gradient(90deg, #94a3b8 0%, #cbd5e1 50%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {lang === "ru" ? "Без водяных знаков." : lang === "de" ? "Ohne Wasserzeichen." : lang === "fr" ? "Sans filigrane." : lang === "es" ? "Sin marcas de agua." : lang === "zh" ? "无水印。" : lang === "ja" ? "透かしなし。" : "No watermarks."}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "#8888a0" }}
          data-testid="text-hero-sub"
        >
          {lang === "ru"
            ? `${tools.length} PDF инструментов — объединяйте, сжимайте, конвертируйте. Обработка локально в браузере.`
            : lang === "de"
            ? `${tools.length} PDF-Werkzeuge — zusammenführen, komprimieren, konvertieren. Lokal im Browser.`
            : `${tools.length} PDF tools — merge, compress, convert. All processed locally in your browser.`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/#tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white text-base hover:opacity-90 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.5)",
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
            data-testid="button-start-free"
          >
            {t.hero.startFree}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-slate-300 hover:text-white text-base border border-slate-700 hover:border-slate-500"
            style={{ background: "rgba(15,23,42,0.5)", transition: "all 0.2s ease" }}
            data-testid="button-view-pro"
          >
            {t.hero.viewPro}
          </Link>
        </motion.div>
      </section>

      {/* ─── STATS ─── */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm hover:border-white/20"
              style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(30,41,59,0.4) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                transition: "border-color 0.3s ease",
              }}
              data-testid={`stat-${stat.label}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-purple-500/8 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="text-4xl font-bold mb-1">
                  <span
                    style={{
                      background: `linear-gradient(90deg, ${stat.gradient.includes("purple") ? "#c084fc" : stat.gradient.includes("blue") ? "#60a5fa" : stat.gradient.includes("emerald") ? "#34d399" : "#fbbf24"}, ${stat.gradient.includes("pink") ? "#f472b6" : stat.gradient.includes("cyan") ? "#22d3ee" : stat.gradient.includes("green") ? "#4ade80" : "#fb923c"})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
                <div className="text-xs tracking-wide uppercase font-medium" style={{ color: "#55556a" }}>
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="container mx-auto px-4 py-12">
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
                className="group relative overflow-hidden rounded-2xl p-5 backdrop-blur-sm hover:border-white/20"
                style={{
                  background: "rgba(15,23,42,0.4)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "border-color 0.3s ease",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(124,58,237,0.05))", transition: "opacity 0.3s ease" }}
                />
                <div className="relative">
                  <div
                    className="inline-flex items-center justify-center rounded-xl mb-3"
                    style={{
                      width: 44,
                      height: 44,
                      background: `linear-gradient(135deg, ${feat.gradient.includes("yellow") ? "#eab308, #f97316" : feat.gradient.includes("orange") ? "#f97316, #ef4444" : feat.gradient.includes("cyan") ? "#06b6d4, #3b82f6" : "#ec4899, #a855f7"})`,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    <Icon className="size-5 text-white" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{feat.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#8888a0" }}>{feat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── TOOLS ─── */}
      <section id="tools" className="section-lazy container mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2
            className="text-4xl font-bold mb-3"
            style={{
              background: "linear-gradient(90deg, #ffffff 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {lang === "ru" ? "Все PDF инструменты в одном месте" : lang === "de" ? "Alle PDF-Werkzeuge an einem Ort" : lang === "fr" ? "Tous les outils PDF en un seul endroit" : lang === "es" ? "Todas las herramientas PDF en un solo lugar" : "All PDF tools in one place"}
          </h2>
          <p style={{ color: "#8888a0" }} className="text-base">
            {lang === "ru" ? `${tools.length} инструментов · ${categories.length} категорий` : `${tools.length} tools · ${categories.length} categories`}
          </p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categoryList.map((cat) => (
            <Link
              key={cat.id}
              href={cat.id === "all" ? "/" : `/?category=${cat.id}`}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium",
                activeCategory === cat.id
                  ? "text-white shadow-lg"
                  : "text-slate-300 border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 hover:text-white"
              )}
              style={{
                transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
                ...(activeCategory === cat.id
                  ? { background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)", boxShadow: "0 4px 16px rgba(99,102,241,0.4)", border: "1px solid rgba(124,58,237,0.7)" }
                  : { background: "rgba(30,41,59,0.5)" }),
              }}
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* ─── AI SECTION ─── */}
      <section id="ai-section" className="section-lazy container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(135deg, rgba(88,28,135,0.4) 0%, rgba(30,58,138,0.4) 50%, rgba(2,6,23,0.6) 100%)",
            border: "1px solid rgba(168,85,247,0.3)",
          }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(59,130,246,0.1))" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 120%, rgba(120,119,198,0.25), transparent 60%)" }} />

          <div className="relative px-8 py-16 md:px-16 text-center">
            <div
              className="inline-flex items-center justify-center size-16 rounded-2xl mb-6 shadow-2xl"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 8px 32px rgba(124,58,237,0.6)" }}
            >
              <Sparkles className="size-8 text-white" />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span style={{ background: "linear-gradient(90deg, #ffffff, #e9d5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {lang === "ru" ? "Встроенный " : "Built-in "}
              </span>
              <span style={{ background: "linear-gradient(90deg, #c084fc, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {lang === "ru" ? "AI-ассистент" : "AI assistant"}
              </span>
              <br />
              <span style={{ background: "linear-gradient(90deg, #ffffff, #bfdbfe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {lang === "ru" ? "для ваших документов" : "for your documents"}
              </span>
            </h2>

            <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
              {lang === "ru"
                ? "AI для обработки, извлечения данных и анализа PDF документов."
                : "AI for processing, data extraction and analysis of your PDF documents."}
            </p>

            <div className="flex flex-wrap justify-center gap-3 text-sm" style={{ color: "#8888a0" }}>
              {[
                lang === "ru" ? "Суммаризация" : "Summarization",
                lang === "ru" ? "Чат с PDF" : "Chat with PDF",
                lang === "ru" ? "Перевод" : "Translation",
                lang === "ru" ? "OCR" : "OCR",
              ].map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2 rounded-full px-4 py-2 border"
                  style={{ background: "rgba(15,23,42,0.5)", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "linear-gradient(135deg, #c084fc, #60a5fa)" }}
                  />
                  {feat}
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs" style={{ color: "#55556a" }}>
              <span
                className="px-2 py-0.5 rounded font-semibold text-purple-400 tracking-wider"
                style={{ background: "rgba(124,58,237,0.2)" }}
              >
                PRO
              </span>
              {" "}
              {lang === "ru" ? "Доступно в Pro" : "Pro plan"}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── CTA ─── */}
      <section className="text-center px-4 py-20 relative">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: 400, background: "radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h2
            className="font-extrabold mb-4"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.03em",
              background: "linear-gradient(90deg, #ffffff, #94a3b8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t.cta.title}
          </h2>
          <p className="mb-8 text-base" style={{ color: "#8888a0" }}>{t.cta.sub}</p>
          <Link
            href="/#tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white hover:opacity-90 hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.45)",
              transition: "transform 0.2s ease, opacity 0.2s ease",
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
