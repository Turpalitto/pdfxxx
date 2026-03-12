import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageSelectorProps {
  file: File;
  /** "select" = click to toggle; "reorder" = drag-and-drop */
  mode: "select" | "reorder";
  /** Fires with 0-based page indices.
   *  select → sorted selected indices
   *  reorder → indices in new order */
  onSelectionChange: (indices: number[]) => void;
  lang?: string; // for aria labels
}

async function loadThumbnails(file: File, scale = 0.18): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const thumbs: string[] = [];
  const canvas = document.createElement("canvas");
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const vp = pg.getViewport({ scale });
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await pg.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    thumbs.push(canvas.toDataURL("image/jpeg", 0.65));
  }
  return thumbs;
}

export function PageSelector({ file, mode, onSelectionChange, lang = "en" }: PageSelectorProps) {
  const isRu = lang === "ru";
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [order, setOrder] = useState<number[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(new Set());
    loadThumbnails(file)
      .then(t => {
        if (cancelled) return;
        setThumbs(t);
        setOrder(Array.from({ length: t.length }, (_, i) => i));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file]);

  const toggleSelect = useCallback((idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  // Notify parent when selection changes (select mode)
  useEffect(() => {
    if (mode === "select") {
      onSelectionChange(Array.from(selected).sort((a, b) => a - b));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mode]);

  // Notify parent when order changes (reorder mode)
  useEffect(() => {
    if (mode === "reorder" && thumbs.length > 0) {
      onSelectionChange(order);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, mode, thumbs.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-5 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        {isRu ? "Загрузка превью страниц…" : "Loading page previews…"}
      </div>
    );
  }

  /* ── REORDER MODE ───────────────────────────────────────────────────────── */
  if (mode === "reorder") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {isRu
            ? `Перетащите страницы, чтобы изменить порядок (всего ${thumbs.length})`
            : `Drag pages to set a new order (${thumbs.length} pages total)`}
        </p>
        <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto py-1 pr-1">
          {order.map((pageIdx, pos) => (
            <div
              key={pageIdx}
              draggable
              onDragStart={() => setDragFrom(pos)}
              onDragOver={e => { e.preventDefault(); setDragOver(pos); }}
              onDrop={e => {
                e.preventDefault();
                if (dragFrom === null || dragFrom === pos) return;
                const next = [...order];
                const [item] = next.splice(dragFrom, 1);
                next.splice(pos, 0, item);
                setOrder(next);
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
              className={cn(
                "relative rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing select-none transition-all duration-150",
                dragFrom === pos
                  ? "opacity-40 border-primary"
                  : dragOver === pos
                    ? "border-primary ring-2 ring-primary/30 scale-105"
                    : "border-border hover:border-primary/40"
              )}
              style={{ width: 72 }}
            >
              <img src={thumbs[pageIdx]} alt={`p${pageIdx + 1}`} className="w-full block bg-white" />
              <div className="flex items-center justify-center gap-0.5 py-0.5 bg-card text-xs">
                <GripVertical className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">{pos + 1}</span>
              </div>
              {/* original page number badge */}
              <div className="absolute top-1 left-1 min-w-4 h-4 rounded-full bg-black/50 flex items-center justify-center text-[9px] font-bold text-white px-1">
                {pageIdx + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── SELECT MODE ────────────────────────────────────────────────────────── */
  const selCount = selected.size;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {isRu
          ? `Нажмите на страницы для выбора (${selCount} из ${thumbs.length})`
          : `Click pages to select (${selCount} of ${thumbs.length} selected)`}
      </p>
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-1.5 max-h-72 overflow-y-auto py-1 pr-1">
        {thumbs.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleSelect(i)}
            className={cn(
              "relative rounded-md border-2 overflow-hidden transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected.has(i)
                ? "border-primary ring-1 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <img src={src} alt={`p${i + 1}`} className="w-full block bg-white" />
            <div className="text-center text-[10px] py-0.5 bg-card text-muted-foreground leading-none">
              {i + 1}
            </div>
            {selected.has(i) && (
              <div className="absolute inset-0 bg-primary/20 flex items-start justify-end p-0.5">
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
