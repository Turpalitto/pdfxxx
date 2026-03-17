import { startTransition, useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles,
  Shield,
  Zap,
  Cloud,
  Lock,
  Upload,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Layers3,
  Wand2,
} from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, categoryColors, getCategoryLabel, getLaunchReadyTools } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { getToolTranslation } from "@/lib/tool-translations";
import { cn } from "@/lib/utils";
import { preloadToolRoute } from "@/lib/route-preload";
import { getRecentTools, getWorkflowPlaybooks } from "@/lib/tool-experience";

export default function Home() {
  const search = useSearch();
  const initialCategory = new URLSearchParams(search).get("category") || "all";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [recentTools, setRecentTools] = useState(() => getRecentTools());
  const { lang } = useLang();

  useEffect(() => {
    const nextCategory = new URLSearchParams(search).get("category") || "all";
    setActiveCategory((current) => (current === nextCategory ? current : nextCategory));
  }, [search]);

  const allTools = getLaunchReadyTools();
  const filteredTools =
    activeCategory === "all"
      ? allTools
      : allTools.filter((tool) => tool.category === activeCategory);
  const previewTools = allTools.slice(0, 4);
  const workflowPlaybooks = getWorkflowPlaybooks(lang);
  const trustSignals = [
    {
      icon: Shield,
      title: lang === "ru" ? "Локальная обработка" : "Local processing",
      description:
        lang === "ru"
          ? "Основные PDF-действия выполняются прямо в браузере, без отправки файла на сервер."
          : "Core PDF actions run in the browser without sending the file to a server.",
    },
    {
      icon: Lock,
      title: lang === "ru" ? "История без файлов" : "History without files",
      description:
        lang === "ru"
          ? "Сохраняются только язык, тема и недавние инструменты. Содержимое документов не записывается."
          : "Only language, theme, and recent tools are stored. Document contents are never recorded.",
    },
    {
      icon: Zap,
      title: lang === "ru" ? "Быстрый UX без очереди" : "Fast UX without queues",
      description:
        lang === "ru"
          ? "Основные разделы прогреваются заранее, а категории переключаются мгновенно."
          : "Primary routes are warmed in advance and categories switch instantly.",
    },
  ];

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === activeCategory) {
      return;
    }

    startTransition(() => {
      setActiveCategory(categoryId);
    });

    if (typeof window !== "undefined") {
      const nextUrl = categoryId === "all" ? "/" : `/?category=${categoryId}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  };

  useSeo({
    title: lang === "ru" ? "PDFX — PDF инструменты онлайн" : "PDFX — Online PDF tools",
    description:
      lang === "ru"
        ? "Объединяйте, сжимайте, конвертируйте, защищайте и распознавайте PDF прямо в браузере."
        : "Merge, compress, convert, protect, and OCR PDF files directly in your browser.",
    path: "/",
  });

  useEffect(() => {
    setRecentTools(getRecentTools());
  }, [lang]);

  const features = [
    {
      icon: Shield,
      title: lang === "ru" ? "Безопасность превыше всего" : "Security first",
      description:
        lang === "ru"
          ? "Файлы обрабатываются локально в браузере без загрузки на сервер"
          : "Files are processed locally in the browser without uploading to a server",
    },
    {
      icon: Zap,
      title: lang === "ru" ? "Быстрая обработка" : "Fast processing",
      description:
        lang === "ru"
          ? "Без ожидания очередей и без установки приложений"
          : "No queueing and no desktop app required",
    },
    {
      icon: Cloud,
      title: lang === "ru" ? "Работает везде" : "Works everywhere",
      description:
        lang === "ru"
          ? "Доступ с любого устройства — компьютера, планшета или смартфона"
          : "Access from any device — desktop, tablet, or smartphone",
    },
    {
      icon: Lock,
      title: lang === "ru" ? "Полная конфиденциальность" : "Full privacy",
      description:
        lang === "ru"
          ? "Мы не храним и не передаём ваши файлы третьим лицам"
          : "We do not store or share your files with third parties",
    },
  ];

  const stats = [
    lang === "ru" ? "100% бесплатно" : "100% free",
    lang === "ru" ? "Безопасно" : "Secure",
    lang === "ru" ? "Без регистрации" : "No registration",
  ];

  const categoryList = [
    { id: "all", label: lang === "ru" ? "Все инструменты" : "All tools" },
    ...categories.map((cat) => ({ id: cat.id, label: getCategoryLabel(cat.id, lang) })),
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.18)_60%,rgba(15,23,42,0.32)_100%)]" />
        <div className="absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pb-28 sm:pt-14 lg:px-8 lg:pb-32 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,420px)] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-2xl text-center lg:text-left"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm text-white/95 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                <span>{lang === "ru" ? "Все инструменты для работы с PDF" : "All tools for working with PDF"}</span>
              </div>

              <h1 className="text-4xl font-bold leading-[0.98] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {lang === "ru" ? "Все инструменты" : "All PDF tools"}
                <br />
                <span className="text-cyan-100">{lang === "ru" ? "для PDF онлайн" : "for working online"}</span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-cyan-50/90 sm:text-xl lg:mx-0">
                {lang === "ru"
                  ? "Конвертируйте, редактируйте, объединяйте и сжимайте PDF файлы онлайн. Начните с нужного инструмента прямо на первом экране."
                  : "Convert, edit, merge, and compress PDF files online. Start with the tool you need right from the first screen."}
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/#tools"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-semibold text-sky-700 shadow-lg shadow-sky-900/20 transition-transform hover:-translate-y-0.5"
                >
                  <Upload className="h-5 w-5" />
                  {lang === "ru" ? "Все инструменты" : "All tools"}
                </Link>
                <Link
                  href="/tools/merge-pdf"
                  onMouseEnter={() => preloadToolRoute("merge-pdf")}
                  onFocus={() => preloadToolRoute("merge-pdf")}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  {lang === "ru" ? "Объединить PDF" : "Merge PDF"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/90 lg:justify-start">
                {stats.map((stat) => (
                  <div key={stat} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-300" />
                    <span>{stat}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="relative mx-auto w-full max-w-[420px]"
            >
              <div className="absolute -right-5 top-8 hidden rounded-2xl border border-white/20 bg-white/14 px-4 py-3 text-white/90 shadow-2xl shadow-sky-900/20 backdrop-blur-md sm:block">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  {lang === "ru" ? "Быстрый старт без лишних шагов" : "Start instantly without extra steps"}
                </div>
              </div>

              <div className="absolute -left-5 bottom-8 hidden rounded-2xl border border-white/20 bg-slate-950/25 px-4 py-3 text-white shadow-2xl shadow-sky-950/20 backdrop-blur-md sm:block">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/12 p-2">
                    <Wand2 className="h-4 w-4 text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                      {lang === "ru" ? "Популярно" : "Popular"}
                    </div>
                    <div className="text-sm font-semibold">{lang === "ru" ? "PDF в Word и JPG" : "PDF to Word and JPG"}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/12 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                <div className="rounded-[1.5rem] bg-slate-950/18 p-4">
                  <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-white">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        {lang === "ru" ? "Рабочая панель" : "Workspace"}
                      </p>
                      <p className="mt-1 text-lg font-semibold">PDFX Toolkit</p>
                    </div>
                    <div className="rounded-xl bg-white/12 p-3">
                      <Layers3 className="h-5 w-5 text-cyan-100" />
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {lang === "ru" ? "Популярные действия" : "Quick actions"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {lang === "ru" ? "Запустите нужный инструмент в один клик" : "Launch the right tool in one click"}
                        </p>
                      </div>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        {lang === "ru" ? "Онлайн" : "Online"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {previewTools.map((tool) => {
                        const Icon = tool.icon;
                        const colors = categoryColors[tool.color] || categoryColors.blue;
                        const { name } = getToolTranslation(tool.slug, lang);

                        return (
                          <div
                            key={tool.slug}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-transform hover:-translate-y-0.5"
                          >
                            <div
                              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                              style={{
                                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                                boxShadow: `0 8px 20px ${colors.glow}`,
                              }}
                            >
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-sm font-semibold leading-5 text-slate-900">{name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                        {lang === "ru" ? "Почему удобно" : "Why it works"}
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-white/90">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          <span>{lang === "ru" ? "Понятный каталог инструментов" : "Clear tools catalog"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                          <span>{lang === "ru" ? "Быстрые действия без лишних экранов" : "Quick start without extra screens"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-200/15 bg-slate-950/28 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/60">
                        {lang === "ru" ? "За 1 минуту" : "In 1 minute"}
                      </div>
                      <div className="mt-3 text-4xl font-bold leading-none text-cyan-50">4+</div>
                      <div className="mt-2 text-sm font-medium leading-6 text-white/80">
                        {lang === "ru" ? "готовых сценария на стартовом экране" : "ready actions above the fold"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="tools" className="relative z-10 -mt-24 bg-slate-50 pb-16 pt-8 sm:-mt-28 sm:pb-20 sm:pt-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200/80 bg-white px-4 py-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-6 sm:py-12 lg:px-8">
          {recentTools.length > 0 && (
            <div className="mb-10 rounded-[1.75rem] border border-sky-100 bg-sky-50/70 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                    {lang === "ru" ? "Продолжить работу" : "Continue working"}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {lang === "ru" ? "Недавние инструменты" : "Recent tools"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    {lang === "ru"
                      ? "PDFX запоминает только последние инструменты в вашем браузере, чтобы вы возвращались к нужному сценарию без лишних шагов."
                      : "PDFX remembers only your recent tools in the browser so you can return to the right flow without extra steps."}
                  </p>
                </div>
                <Link href="/privacy" className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 transition-colors hover:text-sky-800">
                  {lang === "ru" ? "Как это хранится" : "How this is stored"}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {recentTools.map((tool) => (
                  <ToolCard key={`recent-${tool.slug}`} tool={tool} />
                ))}
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-10 text-center sm:mb-12"
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              {lang === "ru" ? "Каталог PDF-инструментов" : "PDF toolkit"}
            </p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {lang === "ru" ? "Выберите инструмент" : "Choose your tool"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {lang === "ru"
                ? "Полный набор инструментов для работы с PDF документами. Выберите нужный инструмент и начните работу."
                : "A complete set of tools for working with PDF documents. Choose the tool you need and get started."}
            </p>
          </motion.div>

          <div className="mb-8 flex flex-wrap justify-center gap-2.5 sm:mb-10">
            {categoryList.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={activeCategory === cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  activeCategory === cat.id
                    ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.slug}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: index * 0.02 }}
              >
                <ToolCard tool={tool} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:px-8 sm:py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {lang === "ru" ? "Workflow-режим" : "Workflow mode"}
                </p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  {lang === "ru" ? "Не просто инструменты, а готовые сценарии" : "Not just tools, but ready-made workflows"}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {lang === "ru"
                  ? "PDFX начинает играть не в каталог ссылок, а в реальные пользовательские задачи: подготовить договор, обработать скан, извлечь контент и вернуть финальный PDF."
                  : "PDFX stops behaving like a tool directory and starts solving real jobs: prepare a contract, clean up a scan, extract content, and ship the final PDF."}
              </p>
            </motion.div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {workflowPlaybooks.map((workflow, index) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className={`rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${workflow.accentClass} p-5`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/90">
                    {lang === "ru" ? "Готовый сценарий" : "Ready workflow"}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{workflow.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-200">{workflow.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {workflow.tools.map((tool, toolIndex) => (
                      <span
                        key={tool.slug}
                        className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100"
                      >
                        {toolIndex + 1}. {getToolTranslation(tool.slug, lang).name}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/tools/${workflow.tools[0].slug}`}
                    onMouseEnter={() => preloadToolRoute(workflow.tools[0].slug)}
                    onFocus={() => preloadToolRoute(workflow.tools[0].slug)}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition-colors hover:text-white"
                  >
                    {lang === "ru" ? "Открыть первый шаг" : "Open first step"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {trustSignals.map((signal, index) => (
                <motion.div
                  key={signal.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.18 + index * 0.05 }}
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <signal.icon className="h-5 w-5 text-cyan-200" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{signal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{signal.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-12 text-center"
          >
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              {lang === "ru" ? "Преимущества" : "Why PDFX"}
            </p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {lang === "ru" ? "Почему выбирают нас" : "Why choose us"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {lang === "ru"
                ? "PDFX сфокусирован на скорости, приватности и понятных сценариях без лишних экранов."
                : "PDFX is built around speed, privacy, and clear flows without extra screens."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-8 text-center"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                  <feature.icon className="h-8 w-8 text-sky-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
