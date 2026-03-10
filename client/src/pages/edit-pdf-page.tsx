import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { PDFDocument, rgb } from "pdf-lib";
import {
  MousePointer2, Type, Pencil, Image as ImageIcon, PenLine,
  Square, Circle, Minus, Highlighter, Eraser, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, Download, ArrowLeft, ChevronLeft, ChevronRight,
  Upload, Loader2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";

type ToolType = "select" | "text" | "draw" | "image" | "sign" | "rect" | "circle" | "line" | "highlight" | "eraser";
type DrawColor = "#1a1a1a" | "#e53e3e" | "#3182ce" | "#38a169" | "#d69e2e";

interface PageDims { width: number; height: number }

const DISPLAY_SCALE = 1.5;
const THUMB_SCALE = 0.15;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
  return pdfjs;
}

async function renderPageToCanvas(
  pdfjsDoc: any, pageNum: number, canvas: HTMLCanvasElement, scale: number
) {
  const page = await pdfjsDoc.getPage(pageNum);
  const vp = page.getViewport({ scale });
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
  return { width: vp.width, height: vp.height };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default function EditPdfPage() {
  const { lang } = useLang();
  const isRu = lang === "ru";

  useSeo({
    title: isRu ? "Редактировать PDF — PDFX" : "Edit PDF — PDFX",
    description: isRu
      ? "Добавляйте текст, рисунки, изображения и подписи к PDF прямо в браузере. Файл не покидает ваш компьютер."
      : "Add text, drawings, images and signatures to PDF directly in the browser. No upload to server.",
  });

  const [file, setFile] = useState<File | null>(null);
  const [pdfjsDoc, setPdfjsDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageDims, setPageDims] = useState<PageDims[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "ready">("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [zoom, setZoom] = useState(1);
  const [drawColor, setDrawColor] = useState<DrawColor>("#1a1a1a");
  const [brushSize, setBrushSize] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState("#1a1a1a");
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null); // fabric.Canvas instance
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const pageStatesRef = useRef<Map<number, string>>(new Map());
  const pageOrigBytesRef = useRef<ArrayBuffer | null>(null);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const signFabricRef = useRef<any>(null);
  const renderingRef = useRef(false);

  const t = {
    title: isRu ? "Редактировать PDF" : "Edit PDF",
    upload: isRu ? "Перетащите PDF сюда или" : "Drop PDF here or",
    choose: isRu ? "Выберите файл" : "Choose file",
    limit: isRu ? "Макс. 25 МБ" : "Max 25 MB",
    save: isRu ? "Скачать PDF" : "Download PDF",
    saving: isRu ? "Сохранение…" : "Saving…",
    undo: isRu ? "Отменить" : "Undo",
    redo: isRu ? "Повторить" : "Redo",
    tools: {
      select: isRu ? "Выбор" : "Select",
      text: isRu ? "Текст" : "Text",
      draw: isRu ? "Рисование" : "Draw",
      image: isRu ? "Изображение" : "Image",
      sign: isRu ? "Подпись" : "Signature",
      rect: isRu ? "Прямоугольник" : "Rectangle",
      circle: isRu ? "Круг" : "Circle",
      line: isRu ? "Линия" : "Line",
      highlight: isRu ? "Маркер" : "Highlight",
      eraser: isRu ? "Ластик" : "Eraser",
    },
    page: isRu ? "стр." : "p.",
    howToUse: isRu ? "Как использовать" : "How to use",
    steps: isRu ? [
      "Загрузите PDF файл",
      "Выберите инструмент в тулбаре",
      "Редактируйте страницы",
      "Нажмите «Скачать PDF»",
    ] : [
      "Upload your PDF file",
      "Select a tool from the toolbar",
      "Edit pages as needed",
      "Click «Download PDF»",
    ],
    signTitle: isRu ? "Нарисуйте подпись" : "Draw your signature",
    signClear: isRu ? "Очистить" : "Clear",
    signConfirm: isRu ? "Добавить" : "Add",
    eraseHint: isRu ? "Кликните на объект чтобы удалить" : "Click an object to delete it",
  };

  const pushHistory = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    const hist = historyRef.current;
    const idx = historyIndexRef.current;
    const newHist = hist.slice(0, idx + 1);
    newHist.push(json);
    if (newHist.length > 50) newHist.shift();
    historyRef.current = newHist;
    historyIndexRef.current = newHist.length - 1;
  }, []);

  const initFabric = useCallback(async () => {
    if (!fabricElRef.current || !pdfCanvasRef.current) return;
    const { Canvas: FabricCanvas, PencilBrush } = await import("fabric");
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }
    const fc = new FabricCanvas(fabricElRef.current, {
      selection: true,
      backgroundColor: "",
      width: pdfCanvasRef.current.width,
      height: pdfCanvasRef.current.height,
    });
    (fc as any)._pdfxPencilBrush = new PencilBrush(fc);
    fabricRef.current = fc;
    historyRef.current = [];
    historyIndexRef.current = -1;

    fc.on("object:added", pushHistory);
    fc.on("object:modified", pushHistory);
    fc.on("object:removed", pushHistory);
    fc.on("mouse:down", (opt: any) => {
      if (activeTool === "eraser" && opt.target) {
        fc.remove(opt.target);
        fc.discardActiveObject();
        fc.renderAll();
      }
    });

    const stored = pageStatesRef.current.get(currentPage);
    if (stored) {
      await fc.loadFromJSON(JSON.parse(stored));
      fc.renderAll();
    }
    pushHistory();
  }, [activeTool, currentPage, pushHistory]);

  const saveCurrent = useCallback(() => {
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    pageStatesRef.current.set(currentPage, json);
  }, [currentPage]);

  useEffect(() => {
    if (loadingState !== "ready") return;
    const timer = setTimeout(() => {
      initFabric();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentPage, loadingState, initFabric]);

  useEffect(() => {
    if (!fabricRef.current) return;
    const fc = fabricRef.current;

    if (activeTool === "draw") {
      fc.isDrawingMode = true;
      const brush = (fc as any)._pdfxPencilBrush;
      brush.color = drawColor;
      brush.width = brushSize;
      fc.freeDrawingBrush = brush;
    } else {
      fc.isDrawingMode = false;
    }

    if (activeTool === "eraser") {
      fc.selection = false;
      fc.hoverCursor = "not-allowed";
    } else if (activeTool === "select") {
      fc.selection = true;
      fc.hoverCursor = "move";
    } else {
      fc.selection = false;
      fc.hoverCursor = "crosshair";
    }
    fc.renderAll();
  }, [activeTool, drawColor, brushSize]);

  const renderCurrentPage = useCallback(async () => {
    if (!pdfjsDoc || !pdfCanvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
    try {
      await renderPageToCanvas(pdfjsDoc, currentPage, pdfCanvasRef.current, DISPLAY_SCALE * zoom);
    } finally {
      renderingRef.current = false;
    }
  }, [pdfjsDoc, currentPage, zoom]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  const handleFile = useCallback(async (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      setError(isRu ? "Файл превышает лимит 25 МБ" : "File exceeds 25 MB limit");
      return;
    }
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError(isRu ? "Пожалуйста загрузите PDF файл" : "Please upload a PDF file");
      return;
    }
    setError(null);
    setLoadingState("loading");
    setLoadProgress(10);

    try {
      const bytes = await f.arrayBuffer();
      pageOrigBytesRef.current = bytes;
      pageStatesRef.current.clear();

      const pdfjs = await loadPdfJs();
      setLoadProgress(30);
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
      const count = doc.numPages;
      setLoadProgress(50);

      const dims: PageDims[] = [];
      const thumbs: string[] = [];
      const thumbCanvas = document.createElement("canvas");
      for (let i = 1; i <= count; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        dims.push({ width: vp.width, height: vp.height });

        const tvp = page.getViewport({ scale: THUMB_SCALE });
        thumbCanvas.width = Math.round(tvp.width);
        thumbCanvas.height = Math.round(tvp.height);
        const ctx = thumbCanvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: tvp, canvas: thumbCanvas }).promise;
        thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.6));
        setLoadProgress(50 + Math.round((i / count) * 45));
      }

      setPdfjsDoc(doc);
      setPageCount(count);
      setPageDims(dims);
      setThumbnails(thumbs);
      setCurrentPage(1);
      setFile(f);
      setLoadProgress(100);
      setLoadingState("ready");
    } catch {
      setError(isRu ? "Не удалось загрузить PDF" : "Failed to load PDF");
      setLoadingState("idle");
    }
  }, [isRu]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const switchPage = useCallback((p: number) => {
    if (p === currentPage) return;
    saveCurrent();
    setCurrentPage(p);
  }, [currentPage, saveCurrent]);

  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLElement>) => {
    if (!fabricRef.current || !pdfCanvasRef.current) return;
    if (activeTool === "select" || activeTool === "draw" || activeTool === "eraser") return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const { IText, Rect, Circle: FabricCircle, Line } = await import("fabric");

    if (activeTool === "text") {
      const obj = new IText("Текст", {
        left: x, top: y,
        fontSize, fill: fontColor,
        fontFamily: "Arial",
        editable: true,
      });
      fabricRef.current.add(obj);
      fabricRef.current.setActiveObject(obj);
      (obj as any).enterEditing?.();
    } else if (activeTool === "rect") {
      const obj = new Rect({
        left: x, top: y, width: 100, height: 60,
        fill: "transparent", stroke: drawColor, strokeWidth: 2,
      });
      fabricRef.current.add(obj);
    } else if (activeTool === "circle") {
      const obj = new FabricCircle({
        left: x, top: y, radius: 40,
        fill: "transparent", stroke: drawColor, strokeWidth: 2,
      });
      fabricRef.current.add(obj);
    } else if (activeTool === "line") {
      const obj = new Line([x, y, x + 100, y], {
        stroke: drawColor, strokeWidth: 2,
      });
      fabricRef.current.add(obj);
    } else if (activeTool === "highlight") {
      const obj = new Rect({
        left: x, top: y, width: 150, height: 24,
        fill: "rgba(255,230,0,0.35)", stroke: "transparent", strokeWidth: 0,
      });
      fabricRef.current.add(obj);
    }
    fabricRef.current.renderAll();
  }, [activeTool, fontSize, fontColor, drawColor, zoom]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const img = e.target.files?.[0];
    if (!img || !fabricRef.current) return;
    const { FabricImage } = await import("fabric");
    const url = URL.createObjectURL(img);
    const el = new window.Image();
    el.onload = async () => {
      const fi = await FabricImage.fromURL(url);
      const maxW = pdfCanvasRef.current!.width * 0.4;
      if (fi.width! > maxW) fi.scaleToWidth(maxW);
      fi.set({ left: 50, top: 50 });
      fabricRef.current.add(fi);
      fabricRef.current.setActiveObject(fi);
      fabricRef.current.renderAll();
    };
    el.src = url;
    e.target.value = "";
  }, []);

  const handleUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0 || !fabricRef.current) return;
    historyIndexRef.current = idx - 1;
    fabricRef.current.loadFromJSON(JSON.parse(historyRef.current[idx - 1])).then(() => {
      fabricRef.current.renderAll();
    });
  }, []);

  const handleRedo = useCallback(() => {
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1 || !fabricRef.current) return;
    historyIndexRef.current = idx + 1;
    fabricRef.current.loadFromJSON(JSON.parse(hist[idx + 1])).then(() => {
      fabricRef.current.renderAll();
    });
  }, []);

  const openSignModal = useCallback(async () => {
    setSignModalOpen(true);
    setTimeout(async () => {
      if (!signCanvasRef.current) return;
      const { Canvas: FabricCanvas, PencilBrush } = await import("fabric");
      if (signFabricRef.current) signFabricRef.current.dispose();
      const sc = new FabricCanvas(signCanvasRef.current, {
        isDrawingMode: true, backgroundColor: "#ffffff",
        width: 480, height: 180,
      });
      const pb = new PencilBrush(sc);
      pb.color = "#1a1a1a";
      pb.width = 3;
      sc.freeDrawingBrush = pb;
      signFabricRef.current = sc;
    }, 100);
  }, []);

  const confirmSign = useCallback(async () => {
    if (!signFabricRef.current || !fabricRef.current) return;
    const dataUrl = signFabricRef.current.toDataURL({ format: "png", quality: 0.9 });
    const { FabricImage } = await import("fabric");
    const el = new window.Image();
    el.onload = async () => {
      const fi = await FabricImage.fromURL(dataUrl);
      fi.scaleToWidth(200);
      fi.set({ left: 50, top: 50 });
      fabricRef.current.add(fi);
      fabricRef.current.renderAll();
    };
    el.src = dataUrl;
    setSignModalOpen(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!pageOrigBytesRef.current || !pdfjsDoc) return;
    setIsSaving(true);
    saveCurrent();

    try {
      const pdfDoc = await PDFDocument.load(pageOrigBytesRef.current, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pageCount; i++) {
        const state = i + 1 === currentPage
          ? (fabricRef.current ? JSON.stringify(fabricRef.current.toJSON()) : null)
          : pageStatesRef.current.get(i + 1);

        if (!state) continue;
        const parsed = JSON.parse(state);
        if (!parsed.objects || parsed.objects.length === 0) continue;

        const dim = pageDims[i];
        const displayW = Math.round(dim.width * DISPLAY_SCALE);
        const displayH = Math.round(dim.height * DISPLAY_SCALE);

        const { Canvas: FabricCanvas } = await import("fabric");
        const tmpEl = document.createElement("canvas");
        tmpEl.width = displayW;
        tmpEl.height = displayH;
        const tmpFc = new FabricCanvas(tmpEl, { backgroundColor: "", width: displayW, height: displayH });
        await tmpFc.loadFromJSON(parsed);
        tmpFc.renderAll();

        const pngDataUrl = tmpFc.toDataURL({ format: "png", multiplier: 1 });
        tmpFc.dispose();

        const imgBytes = dataUrlToBytes(pngDataUrl);
        const pngImage = await pdfDoc.embedPng(imgBytes);
        const page = pages[i];
        const { width: pdfW, height: pdfH } = page.getSize();
        page.drawImage(pngImage, { x: 0, y: 0, width: pdfW, height: pdfH });
      }

      const saved = await pdfDoc.save();
      const blob = new Blob([saved], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (file?.name?.replace(/\.pdf$/i, "") || "document") + "-edited.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [pageCount, currentPage, pageDims, file, pdfjsDoc, saveCurrent]);

  const toolButtons: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: t.tools.select },
    { id: "text", icon: Type, label: t.tools.text },
    { id: "draw", icon: Pencil, label: t.tools.draw },
    { id: "image", icon: ImageIcon, label: t.tools.image },
    { id: "sign", icon: PenLine, label: t.tools.sign },
    { id: "rect", icon: Square, label: t.tools.rect },
    { id: "circle", icon: Circle, label: t.tools.circle },
    { id: "line", icon: Minus, label: t.tools.line },
    { id: "highlight", icon: Highlighter, label: t.tools.highlight },
    { id: "eraser", icon: Eraser, label: t.tools.eraser },
  ];

  const COLORS: DrawColor[] = ["#1a1a1a", "#e53e3e", "#3182ce", "#38a169", "#d69e2e"];

  if (loadingState === "idle" || loadingState === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1">
              <ArrowLeft className="size-4" />
              {isRu ? "Все инструменты" : "All tools"}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
              <p className="text-slate-400">
                {isRu
                  ? "Добавляйте текст, рисунки, подписи и фигуры прямо в браузере. Файл не отправляется на сервер."
                  : "Add text, drawings, signatures and shapes directly in the browser. File never leaves your device."}
              </p>
            </div>

            {loadingState === "loading" ? (
              <div
                className="rounded-2xl p-12 text-center"
                style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Loader2 className="size-10 text-blue-400 mx-auto mb-4 animate-spin" />
                <p className="text-white font-medium mb-2">{isRu ? "Загрузка PDF…" : "Loading PDF…"}</p>
                <div className="w-full max-w-xs mx-auto rounded-full h-2 bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <p className="text-slate-400 text-sm mt-2">{loadProgress}%</p>
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-2xl border-2 border-dashed transition-colors duration-200 cursor-pointer",
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/15 hover:border-white/30"
                )}
                style={{ background: isDragging ? undefined : "rgba(15,23,42,0.7)" }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-edit-pdf"
              >
                <div className="p-16 text-center">
                  <div
                    className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                  >
                    <Upload className="size-8 text-white" />
                  </div>
                  <p className="text-white font-medium mb-1">{t.upload}</p>
                  <button className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                    {t.choose}
                  </button>
                  <p className="text-slate-500 text-sm mt-2">{t.limit} · PDF</p>
                  {error && <p className="text-red-400 text-sm mt-3 font-medium">{error}</p>}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div>
            <div
              className="rounded-2xl p-5"
              style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h3 className="text-white font-semibold mb-4">{t.howToUse}</h3>
              <ol className="space-y-3">
                {t.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-slate-300 text-sm">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-slate-500 text-xs mb-3">{isRu ? "Похожие инструменты" : "Related tools"}</p>
                <div className="flex flex-col gap-2">
                  {[
                    { slug: "sign-pdf", label: isRu ? "Подписать PDF" : "Sign PDF" },
                    { slug: "watermark-pdf", label: isRu ? "Водяной знак" : "Watermark PDF" },
                    { slug: "protect-pdf", label: isRu ? "Защитить PDF" : "Protect PDF" },
                  ].map(({ slug, label }) => (
                    <Link key={slug} href={`/tools/${slug}`}>
                      <div className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm group">
                        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                        {label}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentDim = pageDims[currentPage - 1] || { width: 595, height: 842 };
  const canvasW = Math.round(currentDim.width * DISPLAY_SCALE * zoom);
  const canvasH = Math.round(currentDim.height * DISPLAY_SCALE * zoom);

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left sidebar: thumbnails */}
        <div
          className="w-44 flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ background: "rgba(2,6,23,0.9)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="p-2 text-xs font-medium text-slate-400 sticky top-0 z-10 py-3 px-3"
            style={{ background: "rgba(2,6,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {pageCount} {isRu ? "страниц" : "pages"}
          </div>
          <div className="flex flex-col gap-2 p-2">
            {thumbnails.map((src, i) => (
              <button
                key={i}
                onClick={() => switchPage(i + 1)}
                data-testid={`thumb-page-${i + 1}`}
                className={cn(
                  "rounded-lg overflow-hidden border-2 transition-all duration-150",
                  currentPage === i + 1
                    ? "border-blue-500 shadow-lg shadow-blue-500/20"
                    : "border-transparent hover:border-white/20"
                )}
              >
                <img src={src} alt={`Page ${i + 1}`} className="w-full block" />
                <div className="text-center text-xs text-slate-500 py-1">{i + 1}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-3 py-2 flex-wrap"
            style={{ background: "rgba(2,6,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Tools */}
            {toolButtons.map(({ id, icon: Icon, label }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (id === "image") {
                        document.getElementById("img-upload-input")?.click();
                        return;
                      }
                      if (id === "sign") { openSignModal(); return; }
                      setActiveTool(id);
                    }}
                    data-testid={`tool-${id}`}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-all",
                      activeTool === id
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                    style={activeTool === id ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : undefined}
                  >
                    <Icon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{label}</p>
                  {id === "eraser" && activeTool === "eraser" && (
                    <p className="text-xs text-slate-400">{t.eraseHint}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}

            <div className="w-px h-6 mx-1 bg-white/10" />

            {/* Color picker */}
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setDrawColor(c); setFontColor(c); }}
                  data-testid={`color-${c.replace("#", "")}`}
                  className={cn(
                    "size-5 rounded-full border-2 transition-all",
                    (drawColor === c || fontColor === c) ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="w-px h-6 mx-1 bg-white/10" />

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleUndo}
                  data-testid="button-undo"
                  className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Undo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>{t.undo} (Ctrl+Z)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRedo}
                  data-testid="button-redo"
                  className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Redo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>{t.redo}</p></TooltipContent>
            </Tooltip>

            <div className="w-px h-6 mx-1 bg-white/10" />

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                data-testid="button-zoom-out"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="text-slate-300 text-xs w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                data-testid="button-zoom-in"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <Maximize2 className="size-3.5" />
              </button>
            </div>

            <div className="flex-1" />

            {/* Page nav */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <button
                onClick={() => switchPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs">{t.page} {currentPage} / {pageCount}</span>
              <button
                onClick={() => switchPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage >= pageCount}
                className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="w-px h-6 mx-2 bg-white/10" />

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="gap-2"
              style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
              data-testid="button-save-pdf"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isSaving ? t.saving : t.save}
            </Button>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-auto" style={{ background: "#1a1f2e" }}>
            <div className="flex items-start justify-center min-h-full p-6">
              <div
                className="relative shadow-2xl"
                style={{ width: canvasW, height: canvasH, cursor: activeTool === "text" || activeTool === "rect" || activeTool === "circle" || activeTool === "line" || activeTool === "highlight" ? "crosshair" : undefined }}
                onClick={handleCanvasClick}
              >
                <canvas
                  ref={pdfCanvasRef}
                  style={{ display: "block", position: "absolute", top: 0, left: 0 }}
                />
                <canvas
                  ref={fabricElRef}
                  id="fabric-canvas"
                  style={{ position: "absolute", top: 0, left: 0 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image upload input */}
      <input
        id="img-upload-input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Signature modal */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">{t.signTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              <canvas
                ref={signCanvasRef}
                id="sign-canvas"
                className="block w-full"
                style={{ touchAction: "none" }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={() => signFabricRef.current?.clear?.()}
                className="flex-1 text-slate-400 hover:text-white"
                data-testid="button-sign-clear"
              >
                {t.signClear}
              </Button>
              <Button
                onClick={confirmSign}
                className="flex-1"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                data-testid="button-sign-confirm"
              >
                {t.signConfirm}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
