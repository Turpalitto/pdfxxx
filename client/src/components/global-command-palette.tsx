import { useDeferredValue, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Clock, Search, Sparkles, Workflow } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { loadRecentFiles, type RecentFile } from "@/hooks/use-recent-files";
import { useLang } from "@/lib/lang-context";
import { getCategoryLabel, getToolBySlug } from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import { searchToolRegistry } from "@/tools/search-index";
import {
  buildRecentToolCommands,
  buildWorkflowPresetCommands,
} from "./command-palette-sources";

const DEFAULT_QUERY = "pdf";

export function GlobalCommandPalette() {
  const { lang } = useLang();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => loadRecentFiles());
  const deferredQuery = useDeferredValue(query);
  const effectiveQuery = deferredQuery.trim() || DEFAULT_QUERY;
  const results = searchToolRegistry(effectiveQuery, lang, 8)
    .map((result) => {
      const tool = getToolBySlug(result.entry.slug);

      if (!tool) {
        return null;
      }

      return { entry: result.entry, tool };
    })
    .filter((result): result is NonNullable<typeof result> => Boolean(result));
  const workflowCommands = buildWorkflowPresetCommands(lang);
  const recentCommands = buildRecentToolCommands(recentFiles, lang);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setRecentFiles(loadRecentFiles());
    }
  }, [open]);

  function handleNavigate(url: string) {
    setOpen(false);
    setQuery("");
    navigate(url);
  }

  function handleSelect(slug: string) {
    handleNavigate(`/tools/${slug}`);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="hidden items-center gap-2 rounded-full border border-border bg-white/35 px-3 text-sm text-muted-foreground hover:bg-white/55 hover:text-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span>{lang === "ru" ? "Поиск" : "Search"}</span>
        <kbd className="rounded border border-border bg-white/45 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Ctrl K
        </kbd>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground hover:bg-white/55 hover:text-foreground md:hidden"
        onClick={() => setOpen(true)}
        aria-label={lang === "ru" ? "Поиск инструментов" : "Search tools"}
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={lang === "ru" ? "Что нужно сделать с PDF?" : "What do you need to do with a PDF?"}
        />
        <CommandList>
          <CommandEmpty>
            {lang === "ru" ? "Инструменты не найдены." : "No tools found."}
          </CommandEmpty>
          <CommandGroup heading={lang === "ru" ? "Инструменты" : "Tools"}>
            {results.map(({ entry, tool }) => {
              const translation = getToolTranslation(entry.slug, lang);

              return (
                <CommandItem
                  key={entry.slug}
                  value={`${translation.name} ${translation.description} ${entry.slug}`}
                  onSelect={() => handleSelect(entry.slug)}
                  className="items-start gap-3"
                >
                  <span className="mt-0.5 text-base" aria-hidden="true">
                    {tool.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{translation.name}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                      {translation.description}
                    </span>
                  </span>
                  <CommandShortcut className="normal-case tracking-normal">
                    {getCategoryLabel(entry.category, lang)}
                  </CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading={lang === "ru" ? "Workflow-пресеты" : "Workflow presets"}>
            {workflowCommands.map((command) => (
              <CommandItem
                key={command.id}
                value={command.value}
                onSelect={() => handleNavigate(command.url)}
                className="items-start gap-3"
                data-testid={`palette-workflow-${command.id}`}
              >
                <Workflow className="mt-0.5 h-4 w-4 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{command.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                    {command.description}
                  </span>
                </span>
                <CommandShortcut className="normal-case tracking-normal">
                  {lang === "ru" ? "Цепочка" : "Chain"}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          {recentCommands.length > 0 && (
            <CommandGroup heading={lang === "ru" ? "Недавние инструменты" : "Recent tools"}>
              {recentCommands.map((command) => (
                <CommandItem
                  key={command.slug}
                  value={command.value}
                  onSelect={() => handleNavigate(command.url)}
                  className="items-start gap-3"
                  data-testid={`palette-recent-${command.slug}`}
                >
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{command.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                      {command.description}
                    </span>
                  </span>
                  <CommandShortcut className="normal-case tracking-normal">
                    {lang === "ru" ? "Недавно" : "Recent"}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading={lang === "ru" ? "Быстрые действия" : "Quick actions"}>
            <CommandItem value="workflow chains pipeline" onSelect={() => handleNavigate("/workflow")}>
              <Sparkles className="h-4 w-4" />
              <span>{lang === "ru" ? "Открыть Workflow-цепочки" : "Open Workflow chains"}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
