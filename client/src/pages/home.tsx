import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, FileX, Monitor, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, getCategoryLabel, tools } from "@/lib/tools";
import { useSeo } from "@/hooks/use-seo";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

const RU = {
  seoTitle: "PDFX - \u0412\u0441\u0435 PDF-\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e | \u0411\u0435\u0437 \u0432\u043e\u0434\u044f\u043d\u044b\u0445 \u0437\u043d\u0430\u043a\u043e\u0432",
  statsFiles: "\u0424\u0430\u0439\u043b\u043e\u0432 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u043d\u043e",
  statsCountries: "\u0421\u0442\u0440\u0430\u043d",
  statsTools: "\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u043e\u0432",
  statsLocal: "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u043e",
  badge: "\u0411\u044b\u0441\u0442\u0440\u0430\u044f \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0430 \u043f\u0440\u044f\u043c\u043e \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435",
  hero1: "PDF-\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b",
  hero2: "\u0431\u0435\u0437 \u0442\u043e\u0440\u043c\u043e\u0437\u043e\u0432 \u0438 \u043b\u0438\u0448\u043d\u0435\u0433\u043e \u0432\u0435\u0441\u0430.",
  sub: "\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u043e\u0432 \u0434\u043b\u044f \u043e\u0431\u044a\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f, \u0441\u0436\u0430\u0442\u0438\u044f, \u043a\u043e\u043d\u0432\u0435\u0440\u0442\u0430\u0446\u0438\u0438, \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0438 OCR. \u0412\u0441\u0451 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0438 \u043e\u0449\u0443\u0449\u0430\u0435\u0442\u0441\u044f \u0437\u0430\u043c\u0435\u0442\u043d\u043e \u043b\u0435\u0433\u0447\u0435 \u0434\u0430\u0436\u0435 \u043d\u0430 \u043c\u043e\u0431\u0438\u043b\u044c\u043d\u044b\u0445 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430\u0445.",
  filesTitle: "\u0424\u0430\u0439\u043b\u044b \u043d\u0435 \u0443\u0445\u043e\u0434\u044f\u0442 \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440",
  filesDesc: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u043f\u0440\u044f\u043c\u043e \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435, \u0431\u0435\u0437 \u043b\u0438\u0448\u043d\u0438\u0445 \u043f\u0435\u0440\u0435\u0441\u044b\u043b\u043e\u043a \u0438 \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f.",
  paintTitle: "\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u043f\u0435\u0440\u0432\u044b\u0439 \u044d\u043a\u0440\u0430\u043d",
  paintDesc: "\u0420\u0435\u0434\u0430\u043a\u0442\u043e\u0440 PDF \u0438 \u0442\u044f\u0436\u0451\u043b\u044b\u0435 \u043a\u043e\u043d\u0432\u0435\u0440\u0442\u0435\u0440\u044b \u043d\u0435 \u043c\u0435\u0448\u0430\u044e\u0442 \u0441\u0442\u0430\u0440\u0442\u043e\u0432\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0435.",
  mobileTitle: "\u041b\u0435\u0433\u0447\u0435 \u043d\u0430 \u043c\u043e\u0431\u0438\u043b\u044c\u043d\u044b\u0445",
  mobileDesc: "\u041c\u0435\u043d\u044c\u0448\u0435 \u0434\u043e\u0440\u043e\u0433\u0438\u0445 blur- \u0438 motion-\u044d\u0444\u0444\u0435\u043a\u0442\u043e\u0432 \u043d\u0430 \u0441\u043b\u0430\u0431\u044b\u0445 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430\u0445.",
  watermarkTitle: "\u0411\u0435\u0437 \u0432\u043e\u0434\u044f\u043d\u044b\u0445 \u0437\u043d\u0430\u043a\u043e\u0432",
  watermarkDesc: "\u0411\u0430\u0437\u043e\u0432\u044b\u0435 PDF-\u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0438 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u0441\u0440\u0430\u0437\u0443 \u0438 \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0442 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e.",
  allTitle: "\u0412\u0441\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435",
  allSub: "\u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u043e\u0432 \u0438 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0439 \u0441 \u0431\u044b\u0441\u0442\u0440\u044b\u043c \u0434\u043e\u0441\u0442\u0443\u043f\u043e\u043c.",
  aiTitle: "AI-\u0444\u0443\u043d\u043a\u0446\u0438\u0438 \u0434\u043b\u044f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432",
  aiDesc: "OCR, \u0438\u0437\u0432\u043b\u0435\u0447\u0435\u043d\u0438\u0435 \u0442\u0435\u043a\u0441\u0442\u0430 \u0438 \u0431\u0443\u0434\u0443\u0449\u0438\u0435 AI-\u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0438 \u043c\u043e\u0436\u043d\u043e \u0440\u0430\u0437\u0432\u0438\u0432\u0430\u0442\u044c \u0431\u0435\u0437 \u043f\u0435\u0440\u0435\u0433\u0440\u0443\u0437\u0430 \u0441\u0442\u0430\u0440\u0442\u043e\u0432\u043e\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438: \u0442\u044f\u0436\u0451\u043b\u044b\u0435 \u043c\u043e\u0434\u0443\u043b\u0438 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0430\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0442\u0430\u043c, \u0433\u0434\u0435 \u043e\u043d\u0438 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043d\u0443\u0436\u043d\u044b.",
  aiText: "\u0418\u0437\u0432\u043b\u0435\u0447\u0435\u043d\u0438\u0435 \u0442\u0435\u043a\u0441\u0442\u0430",
  aiConvert: "\u041a\u043e\u043d\u0432\u0435\u0440\u0442\u0430\u0446\u0438\u044f PDF",
  aiNext: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u0448\u0430\u0433: chat with PDF",
};

export default function Home() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeCategory = searchParams.get("category") || "all";
  const { t, lang } = useLang();

  useSeo({
    title: lang === "ru"
      ? RU.seoTitle
      : lang === "de"
        ? "PDFX - Kostenlose PDF-Werkzeuge | Ohne Wasserzeichen"
        : lang === "fr"
          ? "PDFX - Outils PDF gratuits | Sans filigrane"
          : lang === "es"
            ? "PDFX - Herramientas PDF gratis | Sin marcas de agua"
            : "PDFX - All PDF Tools Free | No Watermarks",
    description: t.hero.sub,
    path: "/",
  });

  const filteredTools = useMemo(
    () => (activeCategory === "all" ? tools : tools.filter((tool) => tool.category === activeCategory)),
    [activeCategory]
  );

  const stats = useMemo(
    () => [
      { value: "2M+", label: lang === "ru" ? RU.statsFiles : "Files processed" },
      { value: "180+", label: lang === "ru" ? RU.statsCountries : "Countries" },
      { value: String(tools.length), label: lang === "ru" ? RU.statsTools : "Tools" },
      { value: "100%", label: lang === "ru" ? RU.statsLocal : "Browser-side" },
    ],
    [lang]
  );

  const features = useMemo(
    () => [
      {
        icon: FileX,
        title: lang === "ru" ? RU.filesTitle : "Files stay on device",
        desc: lang === "ru" ? RU.filesDesc : "Processing happens in the browser without extra uploads.",
      },
      {
        icon: Zap,
        title: lang === "ru" ? RU.paintTitle : "Fast first paint",
        desc: lang === "ru" ? RU.paintDesc : "The PDF editor and heavy converters do not block startup anymore.",
      },
      {
        icon: Monitor,
        title: lang === "ru" ? RU.mobileTitle : "Lighter on mobile",
        desc: lang === "ru" ? RU.mobileDesc : "Fewer costly blur and motion effects on slower mobile devices.",
      },
      {
        icon: ShieldCheck,
        title: lang === "ru" ? RU.watermarkTitle : "No watermark output",
        desc: lang === "ru" ? RU.watermarkDesc : "Core PDF workflows stay fast and local from the start.",
      },
    ],
    [lang]
  );

  const categoryList = useMemo(
    () => [{ id: "all", label: t.tools.allTools }, ...categories.map((cat) => ({ id: cat.id, label: getCategoryLabel(cat.id, lang) }))],
    [lang, t.tools.allTools]
  );

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 pb-10 pt-24 sm:px-6 lg:pt-28">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            <Sparkles className="size-4" />
            <span>{lang === "ru" ? RU.badge : "Instant browser-side processing"}</span>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
            <div>
              <h1
                className="max-w-3xl text-3xl font-bold leading-[1.02] tracking-[-0.04em] text-white sm:text-[2.75rem] xl:text-[3.5rem]"
                data-testid="text-hero-title"
              >
                <span className="block bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                  {lang === "ru" ? RU.hero1 : "PDF tools"}
                </span>
                <span className="mt-1 block bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  {lang === "ru" ? RU.hero2 : "without lag and startup bloat."}
                </span>
              </h1>

              <p
                className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-[1.02rem]"
                data-testid="text-hero-sub"
              >
                {lang === "ru"
                  ? `${tools.length} ${RU.sub}`
                  : `${tools.length} PDF tools for merge, compress, convert, edit, and OCR. Faster routes, local processing, and lighter loading on mobile devices.`}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#tools"
                  className="motion-button inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-base font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                    boxShadow: "0 18px 50px rgba(37,99,235,0.28)",
                  }}
                  data-testid="button-start-free"
                >
                  {t.hero.startFree}
                  <ArrowRight className="size-4" />
                </Link>

                <Link
                  href="/pricing"
                  className="motion-surface inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/55 px-7 py-3.5 text-base font-semibold text-slate-100"
                  data-testid="button-view-pro"
                >
                  {t.hero.viewPro}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="motion-surface rounded-3xl border border-white/8 bg-slate-950/55 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.16)]"
                >
                  <div className="text-4xl font-bold tracking-[-0.03em] text-white">{stat.value}</div>
                  <div className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-lazy container mx-auto px-4 py-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="motion-surface rounded-3xl border border-white/8 bg-slate-950/45 p-6"
              >
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">{feature.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="tools" className="section-lazy container mx-auto px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
              {lang === "ru" ? RU.allTitle : "All tools in one place"}
            </h2>
            <p className="mt-3 text-base text-slate-300">
              {lang === "ru"
                ? `${tools.length} ${categories.length} ${RU.allSub}`
                : `${tools.length} tools and ${categories.length} categories with quick access.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {categoryList.map((category) => (
              <Link
                key={category.id}
                href={category.id === "all" ? "/" : `/?category=${category.id}`}
                className={cn(
                  "filter-pill rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  activeCategory === category.id
                    ? "border-blue-400/40 bg-blue-500/15 text-white"
                    : "border-white/8 bg-slate-950/45 text-slate-300 hover:border-white/16 hover:text-white"
                )}
                data-testid={`filter-${category.id}`}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section id="ai-section" className="section-lazy container mx-auto px-4 pb-24 pt-4 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,36,0.92),rgba(21,34,67,0.88),rgba(30,41,59,0.75))]">
          <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200">
                <Sparkles className="size-3.5" />
                AI
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
                {lang === "ru" ? RU.aiTitle : "AI features for documents"}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                {lang === "ru" ? RU.aiDesc : "OCR, text extraction, and future AI workflows can grow without bloating startup: heavy modules only load where they are actually needed."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "OCR",
                lang === "ru" ? RU.aiText : "Text extraction",
                lang === "ru" ? RU.aiConvert : "PDF conversion",
                lang === "ru" ? RU.aiNext : "Next step: chat with PDF",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
