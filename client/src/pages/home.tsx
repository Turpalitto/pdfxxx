import { useDeferredValue, useMemo, useState } from 'react';
import { useSearch } from 'wouter';
import { Link } from 'wouter';
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Grid2X2,
  ShieldCheck,
  Search,
  Workflow,
} from 'lucide-react';
import { buildWorkflowPresetCommands } from '@/components/command-palette-sources';
import { tools, categories, categoryColors, getCategoryLabel } from '@/lib/tools';
import { getRecentTools } from '@/lib/tool-experience';
import { getToolTranslation } from '@/lib/tool-translations';
import { searchToolRegistry } from '@/tools/search-index';
import type { LangCode } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';
import { useSeo } from '@/hooks/use-seo';
import { cn } from '@/lib/utils';

const FEATURED_TOOL_SLUGS = [
  'pdf-to-word',
  'merge-pdf',
  'pdf-to-excel',
  'crop-pdf',
  'pdf-to-jpg',
  'compress-pdf',
  'pdf-to-text',
  'compare-pdf',
];

export default function Home() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const activeCategory = searchParams.get('category') || 'all';
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');
  // Deferred query keeps typing responsive: the search re-render happens at
  // lower priority while the input keeps up with every keystroke.
  const deferredQuery = useDeferredValue(query);

  useSeo({
    title:
      lang === 'ru'
        ? 'PDFX — Все PDF инструменты бесплатно | Без водяных знаков'
        : 'PDFX — All PDF Tools Free | No Watermarks',
    description: t.hero.sub,
    path: '/',
  });

  const isRu = lang === 'ru';
  const featuredTools = useMemo(
    () =>
      FEATURED_TOOL_SLUGS.map((slug) => tools.find((tool) => tool.slug === slug)).filter(
        (tool): tool is (typeof tools)[number] => Boolean(tool),
      ),
    [],
  );

  const searchResults = useMemo(() => {
    if (!deferredQuery.trim()) return null;
    return searchToolRegistry(deferredQuery, lang as LangCode)
      .map((result) => tools.find((tool) => tool.slug === result.entry.slug))
      .filter((tool): tool is (typeof tools)[number] => Boolean(tool));
  }, [deferredQuery, lang]);

  const isSearching = query !== deferredQuery;
  const recentTools = useMemo(
    () =>
      getRecentTools(4).map((tool) => ({
        slug: tool.slug,
        title: getToolTranslation(tool.slug, lang).name,
        url: `/tools/${tool.slug}`,
      })),
    [lang],
  );
  const workflowPresets = useMemo(
    () => buildWorkflowPresetCommands(lang as LangCode),
    [lang],
  );
  const quickTools = [
    ...recentTools,
    ...featuredTools.map((tool) => ({
        slug: tool.slug,
        title: getToolTranslation(tool.slug, lang).name,
        url: `/tools/${tool.slug}`,
      })),
  ]
    .filter((tool, index, list) => list.findIndex((item) => item.slug === tool.slug) === index)
    .slice(0, 5);

  const filteredTools =
    activeCategory === 'all' ? tools : tools.filter((tool) => tool.category === activeCategory);

  const visibleTools = searchResults ?? filteredTools;

  const categoryList = [
    { id: 'all', label: t.tools.allTools },
    ...categories.map((c) => ({ id: c.id, label: getCategoryLabel(c.id, lang) })),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── HERO ─── */}
      <section className="order-1 container mx-auto px-4 pb-4 pt-10 sm:pt-14 md:pb-6 md:pt-16">
        <div className="grid items-end gap-5 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="premium-kicker mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {isRu ? 'Быстрый PDF-инструментарий' : 'Fast PDF toolkit'}
            </p>
            <h1
              className="max-w-4xl text-4xl font-bold leading-[1.03] tracking-[-0.04em] text-slate-950 sm:text-5xl"
              data-testid="text-hero-title"
            >
              {isRu ? 'Все PDF-инструменты под рукой' : 'Every PDF tool within reach'}
            </h1>
          </div>
          <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-700/15 bg-emerald-700/[0.06] px-4 py-3 text-emerald-900">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold">
                {isRu ? 'Файлы остаются на устройстве' : 'Files stay on your device'}
              </p>
              <p className="mt-0.5 text-xs text-emerald-900/65">
                {isRu ? 'Обработка происходит в браузере' : 'Processing happens in your browser'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-7">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isRu ? 'Найти инструмент или описать задачу' : 'Find a tool or describe your task'
            }
            className="h-16 w-full rounded-2xl border border-slate-300 bg-white/75 pl-14 pr-20 text-base text-slate-950 shadow-[0_12px_35px_rgba(54,47,35,0.05)] outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            aria-label={isRu ? 'Поиск инструмента' : 'Search tools'}
            data-testid="input-tool-search"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ArrowRight className="size-5" />
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-500" data-testid="text-hero-sub">
          {isRu
            ? 'Например: сжать PDF, перевести в Word, объединить файлы…'
            : 'For example: compress a PDF, convert to Word, merge files…'}
        </p>
      </section>

      {/* ─── TOOLS ─── */}
      <section id="tools" className="order-2 cv-auto container mx-auto px-4 pb-16 pt-6">
        <div className="grid gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 lg:self-start lg:border-r lg:border-slate-300/70 lg:pr-6">
            <div className="mb-3 flex items-center gap-2 px-3 text-sm font-bold text-slate-950">
              <Grid2X2 className="size-4" />
              {isRu ? 'Категории' : 'Categories'}
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" aria-label={isRu ? 'Категории инструментов' : 'Tool categories'}>
              {categoryList.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.id === 'all' ? '/' : `/?category=${cat.id}`}
                  onClick={() => setQuery('')}
                  className={cn(
                    'shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    activeCategory === cat.id && !query.trim()
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-950',
                  )}
                  data-testid={`filter-${cat.id}`}
                >
                  {cat.label}
                </Link>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">
            <section aria-labelledby="recent-heading">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 className="size-5 text-slate-500" />
                <h2 id="recent-heading" className="text-2xl font-bold text-slate-950">
                  {recentTools.length > 0
                    ? isRu
                      ? 'Недавние и быстрые'
                      : 'Recent and quick'
                    : isRu
                      ? 'Начните отсюда'
                      : 'Start here'}
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {quickTools.map((command) => {
                  const tool = tools.find((item) => item.slug === command.slug);
                  const Icon = tool?.icon;
                  const colors = tool ? categoryColors[tool.color] || categoryColors.blue : categoryColors.blue;
                  return (
                    <Link
                      key={command.slug}
                      href={command.url}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-300/70 bg-white/45 p-3 transition hover:border-primary/30 hover:bg-white/75"
                      data-testid={`home-recent-${command.slug}`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: colors.gradient }}>
                        {Icon && <Icon className="size-5" style={{ color: colors.from }} />}
                      </span>
                      <span className="min-w-0 text-sm font-semibold text-slate-900">{command.title}</span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="my-8 border-t border-slate-300/70" />

            <section aria-labelledby="popular-heading">
              <h2 id="popular-heading" className="mb-4 text-2xl font-bold text-slate-950">
                {query.trim()
                  ? isRu
                    ? 'Результаты поиска'
                    : 'Search results'
                  : isRu
                    ? 'Популярные'
                    : 'Popular'}
              </h2>
              <div className="grid gap-x-8 lg:grid-cols-2">
                {(searchResults ?? featuredTools).map((tool) => {
                  const Icon = tool.icon;
                  const colors = categoryColors[tool.color] || categoryColors.blue;
                  const translation = getToolTranslation(tool.slug, lang);
                  return (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      className="group flex min-h-[80px] items-center gap-4 border-b border-slate-300/70 py-3.5"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: colors.gradient }}>
                        <Icon className="size-6" style={{ color: colors.from }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-slate-950 group-hover:text-primary">{translation.name}</span>
                        <span className="mt-0.5 line-clamp-1 block text-sm text-slate-500">{translation.description}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </Link>
                  );
                })}
              </div>
              {(searchResults?.length === 0 || (visibleTools.length === 0 && !isSearching)) && (
                <p className="rounded-2xl border border-slate-300/70 bg-white/45 p-6 text-center text-slate-500">
                  {isRu ? 'Ничего не найдено. Попробуйте другой запрос.' : 'Nothing found. Try another search.'}
                </p>
              )}
            </section>

            {!query.trim() && workflowPresets[0] && (
              <Link
                href={workflowPresets[0].url}
                className="mt-8 flex items-center gap-4 rounded-2xl border border-emerald-700/20 bg-emerald-700/[0.07] px-5 py-4 transition hover:bg-emerald-700/[0.1]"
                data-testid={`home-workflow-${workflowPresets[0].id}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white"><Workflow className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">{isRu ? 'Готовая цепочка' : 'Ready workflow'}</span>
                  <span className="mt-0.5 block font-bold text-slate-950">{workflowPresets[0].title}</span>
                  <span className="mt-0.5 line-clamp-1 block text-sm text-slate-600">{workflowPresets[0].description}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-emerald-800" />
              </Link>
            )}

            {!query.trim() && (
              <section className="mt-10" aria-labelledby="all-tools-heading">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 id="all-tools-heading" className="text-2xl font-bold text-slate-950">{isRu ? 'Все инструменты' : 'All tools'}</h2>
                    <p className="mt-1 text-sm text-slate-500">{visibleTools.length} {isRu ? 'доступно в браузере' : 'available in your browser'}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleTools.map((tool) => {
                    const Icon = tool.icon;
                    const colors = categoryColors[tool.color] || categoryColors.blue;
                    const translation = getToolTranslation(tool.slug, lang);
                    return (
                      <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/65">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: colors.gradient }}><Icon className="size-4" style={{ color: colors.from }} /></span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 group-hover:text-primary">{translation.name}</span>
                        <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
