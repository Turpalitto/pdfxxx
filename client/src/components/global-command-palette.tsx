import { lazy, Suspense, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang-context';

const LazyCommandPaletteDialog = lazy(() =>
  import('./global-command-palette-dialog').then((module) => ({
    default: module.GlobalCommandPaletteDialog,
  })),
);

export function GlobalCommandPalette() {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setLoaded(true);
        setOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function openPalette() {
    setLoaded(true);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="hidden items-center gap-2 rounded-full border border-border bg-white/35 px-3 text-sm text-muted-foreground hover:bg-white/55 hover:text-foreground md:inline-flex"
        onClick={openPalette}
      >
        <Search className="h-4 w-4" />
        <span>{lang === 'ru' ? 'Поиск' : 'Search'}</span>
        <kbd className="rounded border border-border bg-white/45 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Ctrl K
        </kbd>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground hover:bg-white/55 hover:text-foreground md:hidden"
        onClick={openPalette}
        aria-label={lang === 'ru' ? 'Поиск инструментов' : 'Search tools'}
      >
        <Search className="h-4 w-4" />
      </Button>

      {loaded && (
        <Suspense fallback={null}>
          <LazyCommandPaletteDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
