import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, ScanText } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, getCategoryLabel, getLaunchReadyTools, getToolBySlug } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";

const FEATURED_TOOL_SLUGS = [
  "merge-pdf",
  "compress-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "protect-pdf",
  "ocr-pdf",
];

export default function Home() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeCategory = searchParams.get("category") || "all";
  const { lang } = useLang();

  const allTools = getLaunchReadyTools();
  const featuredTools = FEATURED_TOOL_SLUGS
    .map((slug) => getToolBySlug(slug))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
  const filteredTools =
    activeCategory === "all"
      ? allTools
      : allTools.filter((tool) => tool.category === activeCategory);

  useSeo({
    title: lang === "ru" ? "PDFX — PDF инструменты онлайн" : "PDFX — Online PDF tools",
    description:
      lang === "ru"
        ? "Объединяйте, сжимайте, конвертируйте, защищайте и распознавайте PDF прямо в браузере."
        : "Merge, compress, convert, protect, and OCR PDF files directly in your browser.",
    path: "/",
  });

  const highlights = [
    {
      icon: Zap,
      title: lang === "ru" ? "Быстрая обработка" : "Fast processing",
      desc: lang === "ru" ? "Без ожидания очередей и без установки приложений." : "No queueing and no desktop app required.",
    },
    {
      icon: ShieldCheck,
      title: lang === "ru" ? "Локально в браузере" : "Runs locally",
      desc: lang === "ru" ? "Файлы остаются на устройстве во время базовых операций." : "Files stay on your device during core operations.",
    },
    {
      icon: ScanText,
      title: lang === "ru" ? "Конвертация и OCR" : "Convert and OCR",
      desc: lang === "ru" ? "Word, Excel, изображения, searchable PDF и другие сценарии." : "Word, Excel, images, searchable PDF, and more.",
    },
  ];

  const categoryList = [{ id: "all", label: lang === "ru" ? "Все инструменты" : "All tools" }].concat(
    categories.map((category) => ({ id: category.id, label: getCategoryLabel(category.id, lang) }))
  );

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 pt-16 pb-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-300 mb-6">
              {lang === "ru" ? "PDF-обработка прямо в браузере" : "Browser-based PDF processing"}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-5">
              {lang === "ru"
                ? "Основные PDF-инструменты сразу на главной."
                : "Core PDF tools right on the front page."}
            </h1>
            <p className="text-lg text-slate-400 leading-8 mb-8">
              {lang === "ru"
                ? "Конвертируйте, объединяйте, сжимайте, защищайте и распознавайте PDF без лишних экранов и служебных статусов."
                : "Convert, merge, compress, protect, and OCR PDF files without extra launch-status screens."}
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="/tools/merge-pdf"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  boxShadow: "0 10px 28px rgba(99,102,241,0.35)",
                }}
              >
                {lang === "ru" ? "Объединить PDF" : "Merge PDF"}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/tools/pdf-to-word"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-200 hover:text-white transition-colors"
              >
                {lang === "ru" ? "PDF в Word" : "PDF to Word"}
              </Link>
              <Link
                href="/#tools"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-200 hover:text-white transition-colors"
              >
                {lang === "ru" ? "Все инструменты" : "All tools"}
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 + index * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <item.icon className="size-5 text-sky-300 mb-3" />
                  <div className="text-white font-semibold mb-1.5">{item.title}</div>
                  <div className="text-sm text-slate-400 leading-6">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {featuredTools.map((tool, index) => (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.12 + index * 0.04 }}
              >
                <ToolCard tool={tool} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="tools" className="container mx-auto px-4 py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {lang === "ru" ? "Все PDF-инструменты" : "All PDF tools"}
            </h2>
            <p className="text-slate-400">
              {lang === "ru"
                ? "Откройте нужную категорию или запустите инструмент сразу."
                : "Open the category you need or launch a tool right away."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryList.map((category) => (
              <Link
                key={category.id}
                href={category.id === "all" ? "/" : `/?category=${category.id}`}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  activeCategory === category.id
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool, index) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.02 }}
            >
              <ToolCard tool={tool} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
