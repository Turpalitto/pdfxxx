import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
// import { getPdfPageThumbnails } from "@/lib/pdf-utils";
import { cn } from "@/lib/utils";

interface PageThumbnailsProps {
  file: File;
  selectedPages: Set<number>;
  onToggle: (pageIndex: number) => void;
  maxPages?: number;
  scale?: number;
  label?: string;
  reorderMode?: boolean;
  pageOrder?: number[];
  onReorder?: (newOrder: number[]) => void;
}

export function PageThumbnails({
  file,
  selectedPages,
  onToggle,
  maxPages = 50,
  scale = 0.25,
  label,
  reorderMode = false,
  pageOrder,
  onReorder,
}: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setThumbnails([]);

    // getPdfPageThumbnails(file, scale, maxPages)
    //   .then((thumbs: any) => {
    //     if (!cancelled) {
    //       setThumbnails(thumbs);
    //       setLoading(false);
    //     }
    //   })
    //   .catch((err: any) => {
    //     if (!cancelled) {
    //       setError(err?.message ?? "Failed to render thumbnails");
    //       setLoading(false);
    //     }
    //   });
    
    // Temporary: thumbnails disabled
    setLoading(false);

    return () => { cancelled = true; };
  }, [file, scale, maxPages]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>, displayIndex: number) => {
    setDragSource(displayIndex);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>, displayIndex: number) => {
    e.preventDefault();
    setDragOver(displayIndex);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, targetIndex: number) => {
      e.preventDefault();
      setDragOver(null);
      if (dragSource === null || dragSource === targetIndex || !onReorder) return;
      const order = pageOrder ? [...pageOrder] : thumbnails.map((_, i) => i);
      const [moved] = order.splice(dragSource, 1);
      order.splice(targetIndex, 0, moved);
      onReorder(order);
      setDragSource(null);
    },
    [dragSource, pageOrder, thumbnails, onReorder]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Rendering pages…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const displayOrder = reorderMode && pageOrder ? pageOrder : thumbnails.map((_, i) => i);

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-foreground">{label}</p>
      )}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
        <AnimatePresence>
          {displayOrder.map((pageIdx, displayIdx) => {
            const thumb = thumbnails[pageIdx];
            if (!thumb) return null;
            const isSelected = selectedPages.has(pageIdx);
            const isDragTarget = reorderMode && dragOver === displayIdx;

            return (
              <motion.div
                key={`${pageIdx}-${displayIdx}`}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.18 }}
              >
                <button
                  type="button"
                  draggable={reorderMode}
                  onDragStart={reorderMode ? (e: React.DragEvent<HTMLButtonElement>) => handleDragStart(e, displayIdx) : undefined}
                  onDragOver={reorderMode ? (e: React.DragEvent<HTMLButtonElement>) => handleDragOver(e, displayIdx) : undefined}
                  onDragLeave={reorderMode ? () => setDragOver(null) : undefined}
                  onDrop={reorderMode ? (e: React.DragEvent<HTMLButtonElement>) => handleDrop(e, displayIdx) : undefined}
                  onClick={() => !reorderMode && onToggle(pageIdx)}
                  aria-pressed={!reorderMode ? isSelected : undefined}
                  title={`Page ${pageIdx + 1}`}
                  className={cn(
                    "group relative flex w-full flex-col items-center gap-1 rounded-lg border p-1 transition-all duration-150 select-none",
                    isSelected && !reorderMode
                      ? "border-primary bg-primary/8 shadow-[0_0_0_2px_rgba(35,65,56,0.25)]"
                      : "border-border bg-white/40 hover:border-primary/40 hover:bg-white/60",
                    reorderMode && "cursor-grab active:cursor-grabbing",
                    isDragTarget && "border-primary bg-primary/10 scale-105"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full overflow-hidden rounded-md">
                    <img
                      src={thumb}
                      alt={`Page ${pageIdx + 1}`}
                      className="w-full object-contain"
                      style={{ aspectRatio: "0.707", display: "block" }}
                      draggable={false}
                    />

                    {/* Selected overlay */}
                    {isSelected && !reorderMode && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-md bg-primary/15">
                        <CheckCircle className="h-5 w-5 text-primary drop-shadow" />
                      </div>
                    )}

                    {/* Reorder order badge */}
                    {reorderMode && (
                      <div className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow">
                        {displayIdx + 1}
                      </div>
                    )}
                  </div>

                  {/* Page number label */}
                  <span className={cn(
                    "text-[10px] font-medium leading-none",
                    isSelected && !reorderMode ? "text-primary" : "text-muted-foreground"
                  )}>
                    {pageIdx + 1}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!reorderMode && selectedPages.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedPages.size} page{selectedPages.size !== 1 ? "s" : ""} selected
          {" "}(
          {Array.from(selectedPages)
            .sort((a, b) => a - b)
            .map((i) => i + 1)
            .join(", ")}
          )
        </p>
      )}
    </div>
  );
}
