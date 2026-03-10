import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ToolCard } from "@/components/tool-card";
import { tools, categories } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

export default function Home() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const activeCategory = searchParams.get("category") || "all";
  const { t, lang } = useLang();

  const filteredTools =
    activeCategory === "all"
      ? tools
      : tools.filter((tool) => tool.category === activeCategory);

  const stats = [
    { value: "2М+", label: t.stats.filesProcessed, color: "#a78bfa" },
    { value: "180+", label: t.stats.countries, color: "#06b6d4" },
    { value: "28", label: t.stats.pdfTools, color: "#10b981" },
    { value: "100%", label: t.stats.freeToStart, color: "#f59e0b" },
  ];

  const featureChips = [
    { icon: "🔒", text: t.hero.feat1 },
    { icon: "⚡", text: t.hero.feat2 },
    { icon: "📴", text: t.hero.feat3 },
    { icon: "🚫", text: lang === "ru" ? "Без регистрации" : lang === "de" ? "Keine Anmeldung" : lang === "fr" ? "Sans inscription" : lang === "es" ? "Sin registro" : "No registration" },
  ];

  return (
    <div className="min-h-screen">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden text-center pt-[120px] pb-20 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute"
            style={{
              top: 60, left: "30%", width: 500, height: 500,
              background: "radial-gradient(circle, rgba(108,92,231,0.06) 0%, transparent 60%)",
              animation: "floatOrb 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute"
            style={{
              top: 100, right: "25%", width: 400, height: 400,
              background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 60%)",
              animation: "floatOrb 10s ease-in-out infinite reverse",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 text-sm font-semibold"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#10b981",
            }}
          >
            🔒 {t.hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-extrabold tracking-tight mb-3 leading-[1.08]"
            style={{ fontSize: "clamp(36px, 6vw, 72px)", letterSpacing: "-0.04em" }}
          >
            <span className="block">{t.hero.headline1}</span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #6c5ce7 0%, #a78bfa 40%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t.hero.headline2}
            </span>
            <span className="block text-muted-foreground" style={{ fontSize: "clamp(28px, 4.5vw, 56px)" }}>
              {t.hero.headline3}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground max-w-[580px] mx-auto mt-5 mb-10 leading-relaxed"
            style={{ fontSize: 18 }}
          >
            {t.hero.sub}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex gap-3.5 justify-center flex-wrap"
          >
            <Link
              href="/#tools"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-250"
              style={{
                background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)",
                boxShadow: "0 4px 24px rgba(108,92,231,0.35)",
                fontSize: 16,
              }}
              data-testid="button-start-free"
            >
              {t.hero.startFree} →
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all duration-250 border text-muted-foreground hover:text-foreground"
              style={{ fontSize: 16 }}
              data-testid="button-view-pro"
            >
              {t.hero.viewPro}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex justify-center gap-[60px] flex-wrap pb-20 px-6"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="text-center" data-testid={`stat-${stat.label}`}>
            <div className="font-black leading-none mb-1" style={{ fontSize: 36, letterSpacing: "-0.03em", color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-muted-foreground font-medium uppercase tracking-widest" style={{ fontSize: 12 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── FEATURE CHIPS ─── */}
      <div className="flex justify-center gap-8 flex-wrap pb-20 px-6">
        {featureChips.map((chip) => (
          <div
            key={chip.text}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl border text-muted-foreground font-medium"
            style={{ fontSize: 14, background: "rgba(255,255,255,0.02)" }}
          >
            <span style={{ fontSize: 18 }}>{chip.icon}</span>
            {chip.text}
          </div>
        ))}
      </div>

      {/* ─── TOOLS ─── */}
      <section className="max-w-[1200px] mx-auto px-6 pb-20" id="tools">
        <div className="text-center mb-12">
          <h2 className="font-extrabold mb-3" style={{ fontSize: "clamp(24px, 3.5vw, 38px)", letterSpacing: "-0.03em" }}>
            {t.tools.title}
          </h2>
          <p className="text-muted-foreground max-w-[500px] mx-auto" style={{ fontSize: 16 }}>
            {t.tools.sub}
          </p>
        </div>

        {/* Category pills */}
        <div className="flex justify-center gap-2 flex-wrap mb-10">
          <Link
            href="/"
            className={cn(
              "px-4 py-2 rounded-[10px] text-xs font-semibold border transition-all duration-200",
              activeCategory === "all"
                ? "border-[#6c5ce7] text-[#a78bfa]"
                : "border-border text-muted-foreground hover:border-[#6c5ce7]/50 hover:text-[#a78bfa]"
            )}
            style={{ background: activeCategory === "all" ? "rgba(108,92,231,0.1)" : undefined }}
            data-testid="filter-all"
          >
            {t.tools.allTools}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/?category=${cat.id}`}
              className={cn(
                "px-4 py-2 rounded-[10px] text-xs font-semibold border transition-all duration-200",
                activeCategory === cat.id
                  ? "border-[#6c5ce7] text-[#a78bfa]"
                  : "border-border text-muted-foreground hover:border-[#6c5ce7]/50 hover:text-[#a78bfa]"
              )}
              style={{ background: activeCategory === cat.id ? "rgba(108,92,231,0.1)" : undefined }}
              data-testid={`filter-${cat.id}`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        <motion.div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          layout
        >
          {filteredTools.map((tool, i) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.015 }}
              layout
            >
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── AI SECTION ─── */}
      <section className="max-w-[1000px] mx-auto px-6 pb-20">
        <div
          className="relative overflow-hidden rounded-3xl p-[60px] border"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <div
            className="pointer-events-none absolute"
            style={{
              top: "-50%", right: "-20%", width: 500, height: 500,
              background: "radial-gradient(circle, rgba(108,92,231,0.06) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-extrabold leading-tight mb-4" style={{ fontSize: 32, letterSpacing: "-0.03em" }}>
                {lang === "ru" ? (
                  <>Встроенный <span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI-ассистент</span> для ваших документов</>
                ) : lang === "de" ? (
                  <>Integrierter <span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>KI-Assistent</span> für Ihre Dokumente</>
                ) : lang === "fr" ? (
                  <>Assistant <span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>IA intégré</span> pour vos documents</>
                ) : lang === "es" ? (
                  <>Asistente de <span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>IA integrado</span> para sus documentos</>
                ) : lang === "zh" ? (
                  <>内置<span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI助手</span>为您的文档服务</>
                ) : (
                  <>Built-in <span style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>AI assistant</span> for your documents</>
                )}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6" style={{ fontSize: 15 }}>
                {lang === "ru"
                  ? "Загрузите PDF и задайте любой вопрос. AI прочитает документ и ответит за секунды. Идеально для длинных отчётов, договоров и научных статей."
                  : lang === "de"
                  ? "Laden Sie eine PDF hoch und stellen Sie eine beliebige Frage. Die KI liest das Dokument und antwortet in Sekunden."
                  : lang === "fr"
                  ? "Téléchargez un PDF et posez n'importe quelle question. L'IA lit le document et répond en quelques secondes."
                  : lang === "es"
                  ? "Cargue un PDF y haga cualquier pregunta. La IA lee el documento y responde en segundos."
                  : "Upload a PDF and ask any question. AI reads the document and answers in seconds. Perfect for long reports, contracts, and research papers."}
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  { color: "#a78bfa", text: lang === "ru" ? "Суммаризация — краткое содержание за 10 секунд" : "Summarization — brief summary in 10 seconds" },
                  { color: "#06b6d4", text: lang === "ru" ? "Чат с документом — вопрос-ответ по содержимому" : "Chat with document — Q&A on the content" },
                  { color: "#ec4899", text: lang === "ru" ? "Перевод — 20 языков с сохранением форматирования" : "Translation — 20 languages with formatting preserved" },
                  { color: "#10b981", text: lang === "ru" ? "OCR — распознавание текста со сканов" : "OCR — text recognition from scans" },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2.5 text-muted-foreground" style={{ fontSize: 14 }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-2xl p-6 border font-mono leading-[1.8]"
              style={{ background: "#0a0a14", fontSize: 13, color: "#8585a0" }}
            >
              <div style={{ color: "#a78bfa", marginBottom: 12 }}>📎 договор-аренды.pdf (24 стр.)</div>
              <div style={{ color: "#a78bfa", marginBottom: 12 }}>→ «Какой срок аренды и штрафы за просрочку?»</div>
              <div style={{ borderLeft: "2px solid #6c5ce7", paddingLeft: 14, marginTop: 8, color: "#8585a0" }}>
                Срок аренды: 11 месяцев с 01.03.2026.<br />
                Штраф за просрочку: 0.1% от суммы за каждый день.<br />
                Максимальный штраф: 10% от годовой арендной платы.
                <span
                  className="inline-block align-middle ml-0.5"
                  style={{
                    width: 8, height: 16, background: "#a78bfa",
                    animation: "blinkCursor 1s step-end infinite",
                    verticalAlign: "middle",
                  }}
                />
              </div>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#1a1a2e" }}>
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded"
                  style={{ background: "rgba(108,92,231,0.15)", color: "#a78bfa" }}
                >
                  PRO
                </span>
                <span className="ml-2 text-muted-foreground" style={{ fontSize: 12 }}>
                  {lang === "ru" ? "Доступно в Pro плане" : "Available in Pro plan"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="text-center px-6 pb-24 relative">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: 400, background: "radial-gradient(ellipse at 50% 100%, rgba(108,92,231,0.06) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h2 className="font-extrabold mb-4" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}>
            {t.cta.title}
          </h2>
          <p className="text-muted-foreground mb-8" style={{ fontSize: 16 }}>{t.cta.sub}</p>
          <Link
            href="/#tools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-250"
            style={{
              background: "linear-gradient(135deg, #6c5ce7, #8b5cf6)",
              boxShadow: "0 4px 24px rgba(108,92,231,0.35)",
              fontSize: 16,
            }}
            data-testid="button-cta-tools"
          >
            {t.cta.btn} →
          </Link>
        </div>
      </section>

      <style>{`
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes blinkCursor {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
