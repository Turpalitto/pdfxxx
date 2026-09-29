import { useDeferredValue, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Clock, Sparkles, Workflow } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { loadRecentFiles, type RecentFile } from '@/hooks/use-recent-files';
import { useLang } from '@/lib/lang-context';
import { getCategoryLabel, getToolBySlug } from '@/lib/tools';
import { getToolTranslation } from '@/lib/tool-translations';
import { searchToolRegistry } from '@/tools/search-index';
import { buildRecentToolCommands, buildWorkflowPresetCommands } from './command-palette-sources';

const DEFAULT_QUERY = 'pdf';

type GlobalCommandPaletteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalCommandPaletteDialog({
  open,
  onOpenChange,
}: GlobalCommandPaletteDialogProps) {
  const { lang } = useLang();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => loadRecentFiles());
  const deferredQuery = useDeferredValue(query);
  const effectiveQuery = deferredQuery.trim() || DEFAULT_QUERY;
  const results = searchToolRegistry(effectiveQuery, lang, 8)
    .map((result) => {
      const tool = getToolBySlug(result.entry.slug);
      return tool ? { entry: result.entry, tool } : null;
    })
    .filter((result): result is NonNullable<typeof result> => Boolean(result));
  const workflowCommands = buildWorkflowPresetCommands(lang);
  const recentCommands = buildRecentToolCommands(recentFiles, lang);

  useEffect(() => {
    if (open) setRecentFiles(loadRecentFiles());
  }, [open]);

  function handleNavigate(url: string) {
    onOpenChange(false);
    setQuery('');
    navigate(url);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={lang === 'ru' ? 'Быстрый поиск PDF-инструментов' : 'Quick PDF tool search'}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={
          lang === 'ru' ? 'Что нужно сделать с PDF?' : 'What do you need to do with a PDF?'
        }
      />
      <CommandList>
        <CommandEmpty>
          {lang === 'ru' ? 'Инструменты не найдены.' : 'No tools found.'}
        </CommandEmpty>
        <CommandGroup heading={lang === 'ru' ? 'Инструменты' : 'Tools'}>
          {results.map(({ entry, tool }) => {
            const translation = getToolTranslation(entry.slug, lang);
            return (
              <CommandItem
                key={entry.slug}
                value={`${translation.name} ${translation.description} ${entry.slug}`}
                onSelect={() => handleNavigate(`/tools/${entry.slug}`)}
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
        <CommandGroup heading={lang === 'ru' ? 'Workflow-пресеты' : 'Workflow presets'}>
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
                {lang === 'ru' ? 'Цепочка' : 'Chain'}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        {recentCommands.length > 0 && (
          <CommandGroup heading={lang === 'ru' ? 'Недавние инструменты' : 'Recent tools'}>
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
                  {lang === 'ru' ? 'Недавно' : 'Recent'}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading={lang === 'ru' ? 'Быстрые действия' : 'Quick actions'}>
          <CommandItem value="workflow chains pipeline" onSelect={() => handleNavigate('/workflow')}>
            <Sparkles className="h-4 w-4" />
            <span>{lang === 'ru' ? 'Открыть Workflow-цепочки' : 'Open Workflow chains'}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
