import { useSearch } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
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

  return (
    <div className="min-h-screen">
      {/* ─── SUBTITLE ─── */}
      <div className="text-center pt-7 pb-5 px-4">
        <p className="text-muted-foreground text-sm font-medium" data-testid="text-subtitle">
          {lang === "ru"
            ? `${tools.length} инструментов в ${categories.length} категориях. Бесплатно, без регистрации.`
            : lang === "de"
            ? `${tools.length} Werkzeuge in ${categories.length} Kategorien. Kostenlos, ohne Registrierung.`
            : lang === "fr"
            ? `${tools.length} outils en ${categories.length} catégories. Gratuit, sans inscription.`
            : lang === "es"
            ? `${tools.length} herramientas en ${categories.length} categorías. Gratis, sin registro.`
            : lang === "zh"
            ? `${categories.length}个分类中的${tools.length}个工具。免费，无需注册。`
            : lang === "ja"
            ? `${categories.length}カテゴリで${tools.length}のツール。無料、登録不要。`
            : lang === "ar"
            ? `${tools.length} أداة في ${categories.length} فئات. مجاناً بدون تسجيل.`
            : `${tools.length} tools in ${categories.length} categories. Free, no registration.`}
        </p>
      </div>

      {/* ─── TOOLS ─── */}
      <section className="max-w-[1200px] mx-auto px-4 pb-20" id="tools">
        {/* Category pills */}
        <div className="flex justify-center gap-2 flex-wrap mb-8">
          <Link
            href="/"
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
              activeCategory === "all"
                ? "border-transparent text-white"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-[#6c5ce7]/50"
            )}
            style={
              activeCategory === "all"
                ? { background: "linear-gradient(135deg, #4f8ef7 0%, #6c5ce7 100%)", boxShadow: "0 2px 12px rgba(108,92,231,0.35)" }
                : { background: "transparent" }
            }
            data-testid="filter-all"
          >
            {t.tools.allTools}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/?category=${cat.id}`}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                activeCategory === cat.id
                  ? "border-transparent text-white"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-[#6c5ce7]/50"
              )}
              style={
                activeCategory === cat.id
                  ? { background: "linear-gradient(135deg, #4f8ef7 0%, #6c5ce7 100%)", boxShadow: "0 2px 12px rgba(108,92,231,0.35)" }
                  : { background: "transparent" }
              }
              data-testid={`filter-${cat.id}`}
            >
              {getCategoryLabel(cat.id, lang)}
            </Link>
          ))}
        </div>

        <motion.div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
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

      <style>{`
        @media (max-width: 900px) {
          #tools .grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 600px) {
          #tools .grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </div>
  );
}
