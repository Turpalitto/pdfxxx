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
} from "lucide-react";
import { ToolCard } from "@/components/tool-card";
import { categories, categoryColors, getCategoryLabel, getLaunchReadyTools, getPopularTools } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { getToolTranslation } from "@/lib/tool-translations";
import { cn } from "@/lib/utils";
import { preloadToolRoute } from "@/lib/route-preload";
import { getRecentTools, getWorkflowPlaybooks } from "@/lib/tool-experience";
import { useLazyRender } from "@/hooks/use-lazy-render";

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
  const { visibleCount, sentinelRef } = useLazyRender(filteredTools.length);
  const previewTools = allTools.slice(0, 4);
  const popularTools = getPopularTools();
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

  const categoryList = [
    { id: "all", label: lang === "ru" ? "Все инструменты" : "All tools" },
    ...categories.map((cat) => ({ id: cat.id, label: getCategoryLabel(cat.id, lang) })),
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(241,237,227,0)_0%,rgba(241,237,227,0.88)_40%,rgba(241,237,227,1)_100%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8">
          <div className="grid items-stretch gap-12 lg:gap-20 lg:grid-cols-[58%_42%]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="flex min-h-[520px] flex-col justify-between py-6 text-center sm:py-8 lg:py-10 lg:text-left"
            >
              <div>
                <div className="premium-kicker mb-6 inline-flex items-center gap-2 text-xs font-semibold text-primary/80">
                  <Sparkles className="h-4 w-4" />
                  <span>{lang === "ru" ? "Редакторский стиль · тихая премиальность" : "Editorial style · quiet premium"}</span>
                </div>

                <h1
                  className="paper-title font-bold text-foreground"
                  style={{ fontSize: "clamp(54px, 6vw, 92px)", lineHeight: 0.94, maxWidth: 780 }}
                >
                  {lang === "ru" ? "PDF-сервис с ощущением" : "PDF tools with a"}{" "}
                  <span className="text-primary">{lang === "ru" ? "дорогой бумажной среды." : "premium paper feel."}</span>
                </h1>

                <p className="mx-auto mt-6 max-w-[52rem] text-base leading-8 text-muted-foreground sm:text-lg lg:mx-0">
                  {lang === "ru"
                    ? "Спокойная палитра, мягкий off-white, деликатные зелёные акценты и карточки как листы плотной дизайнерской бумаги. PDFX не кричит, а внушает доверие."
                    : "A calm palette, soft off-white surfaces, delicate green accents, and cards that feel like dense design paper. PDFX stays quiet and trustworthy."}
                </p>

                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-center lg:justify-start">
                  <Link
                    href="/#tools"
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#234138] px-7 text-[15px] font-semibold text-[#f7f3ea] shadow-[0_12px_30px_rgba(35,65,56,0.22)] transition-transform hover:-translate-y-0.5 hover:bg-[#31584f]"
                  >
                    <Upload className="h-5 w-5" />
                    {lang === "ru" ? "Все инструменты" : "All tools"}
                  </Link>
                  <Link
                    href="/tools/merge-pdf"
                    onMouseEnter={() => preloadToolRoute("merge-pdf")}
                    onFocus={() => preloadToolRoute("merge-pdf")}
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-white/55 px-7 text-[15px] font-semibold text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-white/75"
                  >
                    {lang === "ru" ? "Смотреть сценарий" : "View workflow"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="mt-9 text-sm font-medium text-muted-foreground">
                {lang === "ru"
                  ? "100% бесплатно • Без регистрации • Безопасная обработка"
                  : "100% free • No registration • Secure processing"}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="relative mx-auto flex min-h-[520px] w-full items-start justify-center pt-8 sm:pt-10 lg:justify-end lg:pt-12"
            >
              <div className="relative z-[1] w-full max-w-[410px] rotate-[-2deg] rounded-[30px] border border-border bg-[#efe8db] p-3 shadow-[0_18px_50px_rgba(54,47,35,0.08)] opacity-90 lg:scale-[0.92]">
                <div className="rotate-[2deg] rounded-[28px] border border-border bg-[linear-gradient(180deg,rgba(249,246,239,0.96),rgba(237,231,220,0.94))] p-5 shadow-[0_18px_50px_rgba(54,47,35,0.08)]">
                  <div className="flex items-center justify-between rounded-[20px] border border-border bg-white/45 px-4 py-3 text-foreground">
                    <div>
                      <p className="premium-kicker text-xs text-muted-foreground">
                        {lang === "ru" ? "Рабочая панель" : "Workspace"}
                      </p>
                      <p className="paper-title mt-1 text-lg font-semibold">PDFX Toolkit</p>
                    </div>
                    <div className="rounded-[14px] bg-[#cfdacb] p-3">
                      <Layers3 className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-border bg-white/55 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="premium-kicker text-xs font-semibold text-muted-foreground">
                          {lang === "ru" ? "Популярные действия" : "Quick actions"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {lang === "ru" ? "Запустите нужный инструмент в один клик" : "Launch the right tool in one click"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary/70">
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
                            className="rounded-[18px] border border-border bg-[#f7f3ea] p-3 transition-transform hover:-translate-y-0.5"
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
                            <div className="text-sm font-semibold leading-5 text-foreground">{name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[20px] border border-border bg-white/45 p-4 text-foreground">
                      <div className="premium-kicker text-xs text-muted-foreground">
                        {lang === "ru" ? "Почему удобно" : "Why it works"}
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-teal-500" />
                          <span>{lang === "ru" ? "Понятный каталог инструментов" : "Clear tools catalog"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-teal-500" />
                          <span>{lang === "ru" ? "Быстрые действия без лишних экранов" : "Quick start without extra screens"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-border bg-white/45 p-4 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                      <div className="premium-kicker text-xs text-muted-foreground">
                        {lang === "ru" ? "За 1 минуту" : "In 1 minute"}
                      </div>
                      <div className="paper-title mt-3 text-4xl font-bold leading-none text-foreground">4+</div>
                      <div className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
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

      <section id="tools" className="relative z-10 -mt-12 pb-14 pt-0 sm:-mt-16 sm:pb-16">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 lg:px-8">
          {recentTools.length > 0 && (
            <div className="pdfx-panel-muted mb-10 rounded-xl p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="premium-kicker text-xs font-semibold text-primary">
                    {lang === "ru" ? "Продолжить работу" : "Continue working"}
                  </p>
                  <h2 className="paper-title mt-2 text-3xl font-bold text-foreground">
                    {lang === "ru" ? "Недавние инструменты" : "Recent tools"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {lang === "ru"
                      ? "PDFX запоминает только последние инструменты в вашем браузере, чтобы вы возвращались к нужному сценарию без лишних шагов."
                      : "PDFX remembers only your recent tools in the browser so you can return to the right flow without extra steps."}
                  </p>
                </div>
                <Link href="/privacy" className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-foreground">
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

          {activeCategory === "all" && popularTools.length > 0 && (
            <div className="pdfx-panel-muted mb-10 rounded-xl p-5 sm:p-6">
              <div className="flex flex-col gap-2">
                <p className="premium-kicker text-xs font-semibold text-primary">
                  {lang === "ru" ? "Выбор большинства" : "What most people use"}
                </p>
                <h2 className="paper-title text-3xl font-bold text-foreground">
                  {lang === "ru" ? "Популярные инструменты" : "Popular tools"}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {lang === "ru"
                    ? "10 самых востребованных инструментов — с них начинает большинство пользователей."
                    : "The 10 most-used tools — where most people start."}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {popularTools.map((tool, index) => (
                  <div key={`popular-${tool.slug}`} className="relative">
                    <span
                      className="absolute -left-1.5 -top-1.5 z-[2] grid size-6 place-items-center rounded-full bg-[#234138] text-[11px] font-bold text-[#f7f3ea] shadow-sm dark:bg-slate-100 dark:text-slate-950"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <ToolCard tool={tool} />
                  </div>
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
            <p className="premium-kicker mb-3 text-xs font-semibold text-primary">
              {lang === "ru" ? "Каталог PDF-инструментов" : "PDF toolkit"}
            </p>
            <h2 className="paper-title mx-auto max-w-4xl text-4xl font-bold leading-[1.02] text-foreground sm:text-5xl lg:text-6xl">
              {lang === "ru" ? "Выберите инструмент" : "Choose your tool"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
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
                    ? "border-[#234138] bg-[#234138] text-[#f7f3ea] shadow-[0_12px_30px_rgba(35,65,56,0.18)] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                    : "border-border bg-white/45 text-muted-foreground hover:border-primary/40 hover:bg-white/65 hover:text-primary"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.slice(0, visibleCount).map((tool, index) => (
              <motion.div
                key={tool.slug}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.015, ease: "easeOut" }}
              >
                <ToolCard tool={tool} />
              </motion.div>
            ))}
            {visibleCount < filteredTools.length && (
              <div ref={sentinelRef} className="col-span-full h-4" />
            )}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="premium-dark-surface rounded-[34px] px-6 py-10 text-foreground dark:text-white sm:px-8 sm:py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            >
              <div>
                <p className="premium-kicker text-xs font-semibold text-primary dark:text-cyan-300">
                  {lang === "ru" ? "Workflow-режим" : "Workflow mode"}
                </p>
                <h2 className="paper-title mt-3 text-4xl font-bold leading-[1.04] sm:text-5xl">
                  {lang === "ru" ? "Не просто инструменты, а готовые сценарии" : "Not just tools, but ready-made workflows"}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground dark:text-slate-300 sm:text-base">
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
                  className={`rounded-[22px] border border-border bg-white/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-gradient-to-br ${workflow.accentClass}`}
                >
                  <p className="premium-kicker text-xs font-semibold text-primary dark:text-cyan-200/90">
                    {lang === "ru" ? "Готовый сценарий" : "Ready workflow"}
                  </p>
                  <h3 className="paper-title mt-3 text-2xl font-semibold text-foreground dark:text-white">{workflow.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground dark:text-slate-200">{workflow.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {workflow.tools.map((tool, toolIndex) => (
                      <span
                        key={tool.slug}
                        className="rounded-full border border-border bg-white/45 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/8 dark:text-slate-100"
                      >
                        {toolIndex + 1}. {getToolTranslation(tool.slug, lang).name}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/tools/${workflow.tools[0].slug}`}
                    onMouseEnter={() => preloadToolRoute(workflow.tools[0].slug)}
                    onFocus={() => preloadToolRoute(workflow.tools[0].slug)}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-foreground dark:text-cyan-200 dark:hover:text-white"
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
                  className="rounded-[22px] border border-border bg-white/40 p-5 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#cfdacb] dark:bg-white/10">
                    <signal.icon className="h-5 w-5 text-primary dark:text-cyan-200" />
                  </div>
                  <h3 className="paper-title mt-4 text-xl font-semibold text-foreground dark:text-white">{signal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-slate-300">{signal.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-12 text-center"
          >
            <p className="premium-kicker mb-3 text-xs font-semibold text-primary">
              {lang === "ru" ? "Преимущества" : "Why PDFX"}
            </p>
            <h2 className="paper-title text-4xl font-bold text-foreground sm:text-5xl">
              {lang === "ru" ? "Почему выбирают нас" : "Why choose us"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
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
                className="pdfx-panel rounded-[26px] px-6 py-8 text-center"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#cfdacb]">
                  <feature.icon className="h-7 w-7 text-teal-700" />
                </div>
                <h3 className="paper-title text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
