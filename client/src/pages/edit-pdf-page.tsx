import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  MousePointer2, Type, TextCursorInput, Pencil, Image as ImageIcon, PenLine,
  Square, Circle, Minus, Highlighter, Eraser, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, Download, ArrowLeft, ChevronLeft, ChevronRight,
  Upload, Loader2, ArrowRight, Search, ChevronUp, ChevronDown, Copy, ClipboardPaste, Trash2, ChevronsUp, ChevronsDown,
  Bold, Italic, X, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/lib/lang-context";
import { useSeo } from "@/hooks/use-seo";
import { cn } from "@/lib/utils";
import { mbToBytes } from "@/lib/upload-limits";

import type { ToolType, DrawColor, TextAlignOption, PageDims, TextLineMetric, ActiveTextEditor } from "@/lib/edit-pdf-types";
import { DISPLAY_SCALE, THUMB_SCALE, EDITOR_COLORS, EDITOR_FONT_FAMILIES, PDFX_TEXT_CUSTOM_PROPS } from "@/lib/edit-pdf-types";
import {
  MAX_EDIT_PDF_FILE_SIZE_MB,
  loadPdfJs, renderPageToCanvas, hexToRgba, clamp, parseCanvasColor,
  normalizeEditorFontFamily, isEditableTextObject, toEditorColor,
  fitTextObjectToBounds, measureEditorTextWidth,
  measureEditorTextMetrics,
  extractTextLines, findNearestTextLine,
  getHighlightPadding, clampHighlightX,
  resolveHighlightEndLine, resolveTextInsertionStyle,
  buildHighlightRectMetrics, buildLineEditSeed,
} from "@/lib/edit-pdf-utils";
import { useFindReplace } from "@/hooks/use-find-replace";
import { useEditorHistory } from "@/hooks/use-editor-history";
import { useEditorSignature } from "@/hooks/use-editor-signature";
import { useEditorSave } from "@/hooks/use-editor-save";

export default function EditPdfPage() {
  const [, setLocation] = useLocation();
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
  const [mobileThumbsOpen, setMobileThumbsOpen] = useState(false);
  const [pageDims, setPageDims] = useState<PageDims[]>([]);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "ready">("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [zoom, setZoom] = useState(1);
  const [drawColor, setDrawColor] = useState<DrawColor>("#1a1a1a");
  const [brushSize, setBrushSize] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<(typeof EDITOR_FONT_FAMILIES)[number]>("Arial");
  const [fontColor, setFontColor] = useState("#1a1a1a");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<TextAlignOption>("left");
  const [highlightOpacity, setHighlightOpacity] = useState(0.28);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [hasClipboardObject, setHasClipboardObject] = useState(false);
  const [selectionToolContext, setSelectionToolContext] = useState<"text" | "stroke" | "highlight" | null>(null);
  const [activeTextEditor, setActiveTextEditor] = useState<ActiveTextEditor | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricElRef = useRef<HTMLCanvasElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const textMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null); // fabric.Canvas instance
  const pageStatesRef = useRef<Map<number, string>>(new Map());
  const pageTextLinesRef = useRef<Map<number, TextLineMetric[]>>(new Map());
  const pageOrigBytesRef = useRef<ArrayBuffer | null>(null);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const activeToolRef = useRef<ToolType>("select");
  const drawColorRef = useRef<DrawColor>("#1a1a1a");
  const brushSizeRef = useRef(3);
  const fontSizeRef = useRef(16);
  const fontFamilyRef = useRef<(typeof EDITOR_FONT_FAMILIES)[number]>("Arial");
  const fontColorRef = useRef("#1a1a1a");
  const textBoldRef = useRef(false);
  const textItalicRef = useRef(false);
  const textUnderlineRef = useRef(false);
  const textAlignRef = useRef<TextAlignOption>("left");
  const highlightOpacityRef = useRef(0.28);
  const selectionToolbarSyncRef = useRef(false);
  const clipboardRef = useRef<any>(null);
  const renderQueueRef = useRef<Promise<void>>(Promise.resolve());
  const renderVersionRef = useRef(0);
  const initVersionRef = useRef(0);
  const draftObjectRef = useRef<any>(null);
  const draftStartRef = useRef<{ x: number; y: number } | null>(null);
  const draftLineRef = useRef<TextLineMetric | null>(null);
  const hoverLineRectRef = useRef<any>(null);
  const activeTextEditorRef = useRef<ActiveTextEditor | null>(null);
  const syncToolbarFromObjectRef = useRef<(obj: any) => void>(() => {});

  const t = {
    title: isRu ? "Редактировать PDF" : "Edit PDF",
    upload: isRu ? "Перетащите PDF сюда или" : "Drop PDF here or",
    choose: isRu ? "Выберите файл" : "Choose file",
    limit: isRu ? `Макс. ${MAX_EDIT_PDF_FILE_SIZE_MB} МБ` : `Max ${MAX_EDIT_PDF_FILE_SIZE_MB} MB`,
    save: isRu ? "Скачать PDF" : "Download PDF",
    saving: isRu ? "Сохранение…" : "Saving…",
    undo: isRu ? "Отменить" : "Undo",
    redo: isRu ? "Повторить" : "Redo",
    tools: {
      select: isRu ? "Выбор" : "Select",
      text: isRu ? "Текст" : "Text",
      editText: isRu ? "Редактировать текст" : "Edit text",
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

  // History/undo/redo — вынесено в хук (TD-02 Phase 3)
  const {
    pushHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    suppressHistoryRef,
    resetHistory,
  } = useEditorHistory(fabricRef);

  // Signature modal — вынесено в хук (TD-02 Phase 3)
  const {
    signModalOpen,
    setSignModalOpen,
    signCanvasRef,
    clearSignaturePad,
    confirmSign,
    openSignModal,
    disposeSignatureCanvas,
  } = useEditorSignature({ fabricRef, setActiveTool });

  // Find & Replace — вынесено в хук (TD-02 Phase 2)
  const {
    findOpen, setFindOpen,
    findQuery, setFindQuery,
    replaceText, setReplaceText,
    findMatches, setFindMatches,
    findCurrent,
    findInputRef,
    clearFindHighlights,
    findInPage,
    navigateFindMatch,
    replaceCurrentMatch,
    replaceAllMatches,
  } = useFindReplace({
    fabricRef,
    pageTextLinesRef,
    textMeasureCanvasRef,
    currentPage,
    pushHistory,
    setHasUnsavedChanges,
  });

  const updateSelectedObjects = useCallback((updater: (obj: any) => void) => {
    if (!fabricRef.current) return false;
    const activeObjects = fabricRef.current.getActiveObjects?.() || [];
    if (activeObjects.length === 0) return false;

    activeObjects.forEach((obj: any) => {
      updater(obj);
      obj.setCoords?.();
    });
    fabricRef.current.requestRenderAll?.();
    setHasUnsavedChanges(true);
    pushHistory();
    return true;
  }, [pushHistory]);

  const getTextMeasureContext = useCallback(() => {
    if (!textMeasureCanvasRef.current) {
      textMeasureCanvasRef.current = document.createElement("canvas");
    }
    return textMeasureCanvasRef.current.getContext("2d");
  }, []);

  const openTextObjectEditor = useCallback((pageNumber: number, obj: any) => {
    if (!obj || !fabricRef.current) return;
    const fontSize = Number(obj.fontSize ?? fontSizeRef.current ?? 16);
    const maxWidth = Number((obj as any).pdfxMaxWidth ?? obj.width ?? Math.max(fontSize * 12, 220));
    const width = clamp(
      Number(obj.width ?? obj.getScaledWidth?.() ?? Math.max(fontSize * 0.9, 18)),
      18,
      Math.max(18, maxWidth)
    );
    const editorSeed = {
      fontFamily: normalizeEditorFontFamily(obj.fontFamily ?? fontFamilyRef.current),
      fontSize,
      fontWeight: obj.fontWeight === "bold" ? "bold" as const : "normal" as const,
      fontStyle: obj.fontStyle === "italic" ? "italic" as const : "normal" as const,
    };
    const ctx = getTextMeasureContext();
    const lineHeightHint = Number((obj as any).pdfxBaseLineHeight ?? obj.minHeight ?? (obj.lineHeight ?? 1) * fontSize);
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, editorSeed, lineHeightHint)
      : { lineHeight: Math.max(Math.round(fontSize * 1.1), 18), baselineFromTop: fontSize * 0.82 };
    const minHeight = Math.max(Number(obj.minHeight ?? 0), textMetrics.lineHeight, 18);
    const baselineY = Number((obj as any).pdfxBaselineY ?? (Number((obj as any).pdfxBaseTop ?? obj.top ?? 0) + textMetrics.baselineFromTop));

    obj.set({
      visible: false,
      evented: false,
      selectable: false,
    });
    fabricRef.current.discardActiveObject?.();
    fabricRef.current.requestRenderAll?.();

    setActiveTextEditor({
      pageNumber,
      left: Number(obj.left ?? 0),
      top: baselineY - textMetrics.baselineFromTop,
      baselineY,
      width,
      maxWidth: Math.max(18, maxWidth),
      minHeight,
      lineHeight: textMetrics.lineHeight,
      fontFamily: editorSeed.fontFamily,
      fontSize,
      fontWeight: editorSeed.fontWeight,
      fontStyle: editorSeed.fontStyle,
      underline: Boolean(obj.underline),
      textAlign: (obj.textAlign as TextAlignOption) ?? "left",
      color: typeof obj.fill === "string" ? obj.fill : fontColorRef.current,
      backgroundColor: typeof obj.backgroundColor === "string" ? obj.backgroundColor : "transparent",
      text: typeof obj.text === "string" ? obj.text : "",
      sourceObject: obj,
    });
  }, [getTextMeasureContext]);

  const beginTextEditor = useCallback((pageNumber: number, pointer: { x: number; y: number }) => {
    const currentLines = pageTextLinesRef.current.get(pageNumber) || [];
    const insertionStyle = resolveTextInsertionStyle(currentLines, pointer, {
      fontFamily: fontFamilyRef.current,
      fontSize: fontSizeRef.current,
      fontWeight: textBoldRef.current ? "bold" : "normal",
      fontStyle: textItalicRef.current ? "italic" : "normal",
    });
    const nearestLine = findNearestTextLine(currentLines, pointer.x, pointer.y, 28);
    const fontFamily = normalizeEditorFontFamily(nearestLine ? insertionStyle.fontFamily : fontFamilyRef.current);
    const fontSize = insertionStyle.fontSize;
    const ctx = getTextMeasureContext();
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, {
          fontFamily,
          fontSize,
          fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
          fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
        }, nearestLine?.height)
      : { lineHeight: Math.max(Math.round(fontSize * 1.1), nearestLine?.height ?? 0, 18), baselineFromTop: fontSize * 0.82 };
    const lineHeight = textMetrics.lineHeight;
    const minHeight = lineHeight;
    const baselineY = nearestLine
      ? nearestLine.bottom
      : insertionStyle.top + textMetrics.baselineFromTop;
    const top = baselineY - textMetrics.baselineFromTop;
    const maxWidth = insertionStyle.maxWidth;

    setActiveTextEditor({
      pageNumber,
      left: insertionStyle.left,
      top,
      baselineY,
      width: Math.min(Math.max(fontSize * 0.9, 18), maxWidth),
      maxWidth,
      minHeight,
      lineHeight,
      fontFamily,
      fontSize,
      fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
      fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
      underline: textUnderlineRef.current,
      textAlign: textAlignRef.current,
      color: fontColorRef.current,
      backgroundColor: nearestLine ? "#ffffff" : "transparent",
      text: "",
      sourceObject: null,
    });
  }, [getTextMeasureContext, setActiveTextEditor]);

  // Правка существующего текста PDF на месте: маскируем оригинальную строку
  // белым прямоугольником и открываем редактор, заполненный текстом/шрифтом
  // строки. При коммите остаётся «маска + заменяющий Textbox» — браузерный
  // аналог редактирования текста как в Stirling-PDF.
  const beginLineTextEditor = useCallback(async (pageNumber: number, line: TextLineMetric) => {
    if (!fabricRef.current) return;
    if (hoverLineRectRef.current) {
      suppressHistoryRef.current = true;
      try { fabricRef.current.remove(hoverLineRectRef.current); } catch {}
      suppressHistoryRef.current = false;
      hoverLineRectRef.current = null;
    }
    const seed = buildLineEditSeed(line);
    const { Rect } = await import("fabric");
    const mask = new Rect({
      left: seed.mask.left,
      top: seed.mask.top,
      width: seed.mask.width,
      height: seed.mask.height,
      fill: "#ffffff",
      stroke: "transparent",
      selectable: false,
      evented: false,
    });
    (mask as any).data = { pdfxReplacement: true };
    fabricRef.current.add(mask);
    fabricRef.current.requestRenderAll?.();

    const ctx = getTextMeasureContext();
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, {
          fontFamily: seed.fontFamily,
          fontSize: seed.fontSize,
          fontWeight: seed.fontWeight,
          fontStyle: seed.fontStyle,
        }, line.height)
      : { lineHeight: Math.max(Math.round(seed.fontSize * 1.1), line.height, 18), baselineFromTop: seed.fontSize * 0.82 };
    const lineHeight = textMetrics.lineHeight;
    const top = seed.baselineY - textMetrics.baselineFromTop;

    setActiveTextEditor({
      pageNumber,
      left: seed.left,
      top,
      baselineY: seed.baselineY,
      width: Math.min(Math.max(line.right - line.left, seed.fontSize * 0.9, 18), seed.maxWidth),
      maxWidth: seed.maxWidth,
      minHeight: lineHeight,
      lineHeight,
      fontFamily: seed.fontFamily,
      fontSize: seed.fontSize,
      fontWeight: seed.fontWeight,
      fontStyle: seed.fontStyle,
      underline: false,
      textAlign: "left",
      color: fontColorRef.current,
      backgroundColor: "transparent",
      text: seed.text,
      sourceObject: null,
      maskObject: mask,
    });
  }, [getTextMeasureContext]);

  // Коммит текста в страницу, которая сейчас НЕ на canvas (editor.pageNumber !==
  // currentPage). Загружаем сохранённый JSON этой страницы в offscreen StaticCanvas,
  // добавляем Textbox, сериализуем обратно в pageStatesRef. Так текст не теряется
  // при смене страницы с открытым редактором.
  const commitEditorToStoredPage = useCallback(async (editor: ActiveTextEditor, text: string) => {
    const { StaticCanvas, Textbox, FabricObject } = await import("fabric");
    FabricObject.customProperties = Array.from(new Set([
      ...(FabricObject.customProperties ?? []),
      ...PDFX_TEXT_CUSTOM_PROPS,
    ]));
    Textbox.customProperties = Array.from(new Set([
      ...(Textbox.customProperties ?? []),
      ...PDFX_TEXT_CUSTOM_PROPS,
    ]));

    const ctx = getTextMeasureContext();
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, editor, editor.lineHeight)
      : { lineHeight: editor.lineHeight, baselineFromTop: editor.fontSize * 0.82 };
    const normalizedTop = (editor.baselineY ?? (editor.top + textMetrics.baselineFromTop)) - textMetrics.baselineFromTop;
    const lineHeightMultiplier = Math.max(1, textMetrics.lineHeight / Math.max(editor.fontSize, 1));

    const dim = pageDims[editor.pageNumber - 1] || { width: 595, height: 842 };
    const width = Math.round(dim.width * DISPLAY_SCALE);
    const height = Math.round(dim.height * DISPLAY_SCALE);
    const offscreen = new StaticCanvas(undefined, { width, height });
    try {
      const stored = pageStatesRef.current.get(editor.pageNumber);
      if (stored) {
        await offscreen.loadFromJSON(JSON.parse(stored));
      }
      const obj = new Textbox(text, {
        left: editor.left,
        top: normalizedTop,
        fontSize: editor.fontSize,
        fill: editor.color,
        fontFamily: editor.fontFamily,
        fontWeight: editor.fontWeight,
        fontStyle: editor.fontStyle,
        underline: editor.underline,
        textAlign: editor.textAlign,
        editable: false,
        lineHeight: lineHeightMultiplier,
        width: editor.width,
        padding: 0,
        backgroundColor: editor.backgroundColor,
      });
      (obj as any).pdfxBaseFontSize = editor.fontSize;
      (obj as any).pdfxMaxWidth = editor.maxWidth;
      (obj as any).pdfxBaseTop = normalizedTop;
      (obj as any).pdfxBaseLineHeight = textMetrics.lineHeight;
      (obj as any).pdfxBaselineY = editor.baselineY ?? (normalizedTop + textMetrics.baselineFromTop);
      (obj as any).pdfxAutoWidth = true;
      (obj as any).minHeight = textMetrics.lineHeight;
      fitTextObjectToBounds(obj, editor.fontSize);
      offscreen.add(obj);
      pageStatesRef.current.set(editor.pageNumber, JSON.stringify(offscreen.toJSON()));
      setHasUnsavedChanges(true);
    } finally {
      offscreen.dispose();
    }
  }, [getTextMeasureContext, pageDims]);

  const commitTextEditor = useCallback(async () => {
    const editor = activeTextEditorRef.current;
    if (!editor || !fabricRef.current) {
      setActiveTextEditor(null);
      return false;
    }
    // Редактор относится к другой странице, чем сейчас показана на canvas
    // (пользователь переключил страницу, не закрыв textarea — onBlur пришёл
    // уже после смены currentPage). Раньше текст здесь молча терялся. Мержим
    // его в сохранённый JSON исходной страницы через offscreen StaticCanvas.
    if (editor.pageNumber !== currentPage) {
      const text = editor.text.trim();
      if (text) {
        await commitEditorToStoredPage(editor, text);
      }
      setActiveTextEditor(null);
      return text ? true : false;
    }

    const text = editor.text.trim();
    if (!text) {
      if (editor.sourceObject && fabricRef.current) {
        fabricRef.current.remove(editor.sourceObject);
        fabricRef.current.requestRenderAll?.();
        setHasSelection(false);
      }
      setActiveTextEditor(null);
      return false;
    }

    const ctx = getTextMeasureContext();
    const textMetrics = ctx
      ? measureEditorTextMetrics(ctx, editor, editor.lineHeight)
      : { lineHeight: editor.lineHeight, baselineFromTop: editor.fontSize * 0.82 };
    const normalizedTop = (editor.baselineY ?? (editor.top + textMetrics.baselineFromTop)) - textMetrics.baselineFromTop;
    const lineHeightMultiplier = Math.max(1, textMetrics.lineHeight / Math.max(editor.fontSize, 1));
    let obj = editor.sourceObject;
    if (!obj) {
      const { Textbox } = await import("fabric");
      obj = new Textbox(text, {
        left: editor.left,
        top: normalizedTop,
        fontSize: editor.fontSize,
        fill: editor.color,
        fontFamily: editor.fontFamily,
        fontWeight: editor.fontWeight,
        fontStyle: editor.fontStyle,
        underline: editor.underline,
        textAlign: editor.textAlign,
        editable: false,
        lineHeight: lineHeightMultiplier,
        width: editor.width,
        padding: 0,
        backgroundColor: editor.backgroundColor,
      });
      fabricRef.current.add(obj);
    }
    obj.set({
      text,
      left: editor.left,
      top: normalizedTop,
      fontSize: editor.fontSize,
      fill: editor.color,
      fontFamily: editor.fontFamily,
      fontWeight: editor.fontWeight,
      fontStyle: editor.fontStyle,
      underline: editor.underline,
      textAlign: editor.textAlign,
      editable: false,
      lineHeight: lineHeightMultiplier,
      width: editor.width,
      padding: 0,
      backgroundColor: editor.backgroundColor,
      visible: true,
      evented: true,
      selectable: true,
    });
    (obj as any).pdfxBaseFontSize = editor.fontSize;
    (obj as any).pdfxMaxWidth = editor.maxWidth;
    (obj as any).pdfxBaseTop = normalizedTop;
    (obj as any).pdfxBaseLineHeight = textMetrics.lineHeight;
    (obj as any).pdfxBaselineY = editor.baselineY ?? (normalizedTop + textMetrics.baselineFromTop);
    (obj as any).pdfxAutoWidth = true;
    obj.minHeight = textMetrics.lineHeight;
    fitTextObjectToBounds(obj, editor.fontSize);
    try {
      fabricRef.current.setActiveObject?.(obj);
    } catch {
      // Ignore transient activation errors.
    }
    fabricRef.current.requestRenderAll?.();
    setHasSelection(true);
    setHasUnsavedChanges(true);
    syncToolbarFromObjectRef.current(obj);
    setActiveTextEditor(null);
    return true;
  }, [currentPage, commitEditorToStoredPage]);

  const cancelTextEditor = useCallback(() => {
    const editor = activeTextEditorRef.current;
    if (editor?.maskObject && fabricRef.current) {
      // Edit was abandoned — drop the mask so the original PDF text shows again.
      try { fabricRef.current.remove(editor.maskObject); } catch {}
      fabricRef.current.requestRenderAll?.();
    }
    if (editor?.sourceObject) {
      editor.sourceObject.set({
        visible: true,
        evented: true,
        selectable: true,
      });
      fabricRef.current?.setActiveObject?.(editor.sourceObject);
      fabricRef.current?.requestRenderAll?.();
    }
    setActiveTextEditor(null);
  }, []);

  const syncToolbarFromObject = useCallback((obj: any) => {
    const target = obj?.type === "activeSelection" && typeof obj.getObjects === "function"
      ? obj.getObjects()[0]
      : obj;
    if (!target) return;

    selectionToolbarSyncRef.current = true;

    const releaseSync = () => {
      window.setTimeout(() => {
        selectionToolbarSyncRef.current = false;
      }, 0);
    };

    try {
      if (target.type === "textbox" || target.type === "i-text" || target.type === "text") {
        setSelectionToolContext("text");
        const nextFontFamily = normalizeEditorFontFamily(target.fontFamily);
        if (EDITOR_FONT_FAMILIES.includes(nextFontFamily as (typeof EDITOR_FONT_FAMILIES)[number])) {
          setFontFamily(nextFontFamily as (typeof EDITOR_FONT_FAMILIES)[number]);
        }
        if (typeof target.fill === "string") {
          setFontColor(target.fill);
        }
        const nextFontSize = Number((target as any).pdfxBaseFontSize ?? target.fontSize ?? fontSizeRef.current);
        if (Number.isFinite(nextFontSize)) {
          setFontSize(Math.round(nextFontSize));
        }
        setTextBold(target.fontWeight === "bold");
        setTextItalic(target.fontStyle === "italic");
        setTextUnderline(Boolean(target.underline));
        setTextAlign((target.textAlign ?? "left") as TextAlignOption);
      } else if (target.type === "line") {
        setSelectionToolContext("stroke");
        const nextColor = toEditorColor(target.stroke);
        if (nextColor) setDrawColor(nextColor);
        const nextSize = Number(target.strokeWidth ?? brushSizeRef.current);
        if (Number.isFinite(nextSize)) {
          setBrushSize(clamp(Math.round(nextSize), 1, 24));
        }
      } else if (target.type === "ellipse" || (target.type === "rect" && target.stroke !== "transparent")) {
        setSelectionToolContext("stroke");
        const nextColor = toEditorColor(target.stroke);
        if (nextColor) setDrawColor(nextColor);
        const nextSize = Number(target.strokeWidth ?? brushSizeRef.current);
        if (Number.isFinite(nextSize)) {
          setBrushSize(clamp(Math.round(nextSize), 1, 24));
        }
      } else if (target.type === "rect" && target.stroke === "transparent") {
        setSelectionToolContext("highlight");
        const parsed = parseCanvasColor(target.fill);
        const nextColor = toEditorColor(parsed?.hex);
        if (nextColor) setDrawColor(nextColor);
        if (parsed) setHighlightOpacity(parsed.alpha);
      } else if (target.type === "group" && typeof target.getObjects === "function") {
        setSelectionToolContext("highlight");
        const child = target.getObjects().find((item: any) => item.type === "rect");
        const parsed = parseCanvasColor(child?.fill);
        const nextColor = toEditorColor(parsed?.hex);
        if (nextColor) setDrawColor(nextColor);
        if (parsed) setHighlightOpacity(parsed.alpha);
      } else {
        setSelectionToolContext(null);
      }
    } finally {
      releaseSync();
    }
  }, []);

  useEffect(() => {
    syncToolbarFromObjectRef.current = syncToolbarFromObject;
  }, [syncToolbarFromObject]);

  const getCanvasSize = useCallback((pageNumber: number) => {
    const dim = pageDims[pageNumber - 1] || { width: 595, height: 842 };
    return {
      width: Math.round(dim.width * DISPLAY_SCALE),
      height: Math.round(dim.height * DISPLAY_SCALE),
    };
  }, [pageDims]);

  const applyCanvasCssSize = useCallback((width: number, height: number) => {
    const renderedWidth = Math.round(width * zoom);
    const renderedHeight = Math.round(height * zoom);

    if (pdfCanvasRef.current) {
      pdfCanvasRef.current.style.width = `${renderedWidth}px`;
      pdfCanvasRef.current.style.height = `${renderedHeight}px`;
    }

    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width: renderedWidth, height: renderedHeight }, { cssOnly: true });
      fabricRef.current.calcOffset?.();
      fabricRef.current.requestRenderAll?.();
    } else if (fabricElRef.current) {
      fabricElRef.current.style.width = `${renderedWidth}px`;
      fabricElRef.current.style.height = `${renderedHeight}px`;
    }
  }, [zoom]);

  const loadCanvasState = useCallback(async (canvas: any, state: string) => {
    suppressHistoryRef.current = true;
    try {
      await canvas.loadFromJSON(JSON.parse(state));
      canvas.renderAll();
    } finally {
      suppressHistoryRef.current = false;
    }
  }, []);

  const initFabric = useCallback(async (pageNumber: number) => {
    if (!fabricElRef.current) return;
    const version = ++initVersionRef.current;
    const {
      Canvas: FabricCanvas,
      FabricObject,
      PencilBrush,
      Textbox,
      Rect,
      Ellipse,
      Line,
      Group,
    } = await import("fabric");
    const IText = Textbox;
    FabricObject.customProperties = Array.from(new Set([
      ...(FabricObject.customProperties ?? []),
      ...PDFX_TEXT_CUSTOM_PROPS,
    ]));
    Textbox.customProperties = Array.from(new Set([
      ...(Textbox.customProperties ?? []),
      ...PDFX_TEXT_CUSTOM_PROPS,
    ]));
    if (version !== initVersionRef.current) return;
    const { width, height } = getCanvasSize(pageNumber);
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }
    const fc = new FabricCanvas(fabricElRef.current, {
      selection: true,
      backgroundColor: "",
      width,
      height,
    });
    (fc as any)._pdfxPencilBrush = new PencilBrush(fc);
    fabricRef.current = fc;
    applyCanvasCssSize(width, height);
    resetHistory();
    setHasSelection(false);
    setSelectionToolContext(null);

    fc.on("object:added", pushHistory);
    fc.on("object:modified", pushHistory);
    fc.on("object:removed", pushHistory);
    fc.on("object:added", () => {
      if (!suppressHistoryRef.current) setHasUnsavedChanges(true);
    });
    fc.on("object:modified", () => {
      if (!suppressHistoryRef.current) setHasUnsavedChanges(true);
    });
    fc.on("object:removed", () => {
      if (!suppressHistoryRef.current) {
        setHasUnsavedChanges(true);
        setHasSelection(false);
      }
    });
    fc.on("selection:created", () => {
      setHasSelection(true);
      syncToolbarFromObject(fc.getActiveObject?.());
    });
    fc.on("selection:updated", () => {
      setHasSelection(true);
      syncToolbarFromObject(fc.getActiveObject?.());
    });
    fc.on("selection:cleared", () => {
      setHasSelection(false);
      setSelectionToolContext(null);
      selectionToolbarSyncRef.current = false;
    });
    fc.on("mouse:dblclick", (opt: any) => {
      if (!opt.target || !isEditableTextObject(opt.target)) return;
      if (activeToolRef.current !== "select" && activeToolRef.current !== "text") return;
      openTextObjectEditor(pageNumber, opt.target);
    });
    fc.on("text:changed", (opt: any) => {
      const obj = opt.target;
      if (!obj) return;

      if (obj.isEditing) {
        const maxWidth = Number((obj as any).pdfxMaxWidth ?? obj.width ?? 0);
        if (Number.isFinite(maxWidth) && maxWidth > 24) {
          const autoWidth = Boolean((obj as any).pdfxAutoWidth);
          if (autoWidth) {
            const text = typeof obj.text === "string" ? obj.text : "";
            const measuredWidth = text.trim() && typeof obj.calcTextWidth === "function"
              ? obj.calcTextWidth()
              : 0;
            obj.set({
              width: clamp(
                (measuredWidth || obj.fontSize || 16) + Math.max(6, (obj.fontSize || 16) * 0.35),
                18,
                maxWidth
              ),
            });
          } else {
            obj.set({ width: maxWidth });
          }
          obj.initDimensions?.();
        }
      } else {
        fitTextObjectToBounds(obj, fontSizeRef.current);
      }

      obj.setCoords?.();
      fc.requestRenderAll?.();
    });
    fc.on("text:editing:exited", (opt: any) => {
      const obj = opt.target;
      if (!obj) return;

      const text = typeof obj.text === "string" ? obj.text.trim() : "";
      if (!text) {
        suppressHistoryRef.current = true;
        try {
          fc.remove(obj);
          fc.discardActiveObject();
          setHasSelection(false);
        } finally {
          suppressHistoryRef.current = false;
        }
        fc.requestRenderAll?.();
        return;
      }

      fitTextObjectToBounds(obj, fontSizeRef.current);
      obj.setCoords?.();
      fc.setActiveObject(obj);
      fc.requestRenderAll?.();
      setHasUnsavedChanges(true);
      pushHistory();
      syncToolbarFromObject(obj);
    });
    fc.on("object:modified", () => syncToolbarFromObject(fc.getActiveObject?.()));
    fc.on("mouse:down", (opt: any) => {
      if (activeToolRef.current === "eraser" && opt.target) {
        fc.remove(opt.target);
        fc.discardActiveObject();
        fc.renderAll();
        return;
      }

      if (activeToolRef.current === "draw" || activeToolRef.current === "select") {
        return;
      }

      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e);
      if (!pointer) return;
      const currentLines = pageTextLinesRef.current.get(pageNumber) || [];

      if (activeToolRef.current === "edit-text") {
        if (opt.target && isEditableTextObject(opt.target)) {
          openTextObjectEditor(pageNumber, opt.target);
          return;
        }
        const line = findNearestTextLine(currentLines, pointer.x, pointer.y, 28);
        if (line) {
          fc.discardActiveObject?.();
          fc.requestRenderAll?.();
          void beginLineTextEditor(pageNumber, line);
        }
        return;
      }

      if (activeToolRef.current === "text") {
        if (opt.target && isEditableTextObject(opt.target)) {
          openTextObjectEditor(pageNumber, opt.target);
          return;
        }
        fc.discardActiveObject?.();
        fc.requestRenderAll?.();
        beginTextEditor(pageNumber, pointer);
        return;
      }

      if (opt.target) {
        return;
      }

      const snappedLine = activeToolRef.current === "highlight"
        ? findNearestTextLine(currentLines, pointer.x, pointer.y, 28)
        : null;

      draftStartRef.current = snappedLine
        ? { x: pointer.x, y: snappedLine.centerY }
        : pointer;
      draftLineRef.current = snappedLine;
      suppressHistoryRef.current = true;

      if (activeToolRef.current === "rect") {
        const obj = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: "transparent",
          stroke: drawColorRef.current,
          strokeWidth: Math.max(1, brushSizeRef.current),
          selectable: false,
          evented: false,
        });
        draftObjectRef.current = obj;
        fc.add(obj);
      } else if (activeToolRef.current === "highlight") {
        const highlightPadding = getHighlightPadding(brushSizeRef.current);
        const highlightColor = hexToRgba(drawColorRef.current, highlightOpacityRef.current);
        const highlightRects = snappedLine
          ? buildHighlightRectMetrics(
              currentLines,
              draftStartRef.current ?? pointer,
              pointer,
              snappedLine,
              snappedLine,
              highlightPadding.x,
              highlightPadding.y
            )
          : [];

        const obj = highlightRects.length > 1
          ? new Group(
              highlightRects.map((rect) => new Rect({
                ...rect,
                fill: highlightColor,
                stroke: "transparent",
                strokeWidth: 0,
                selectable: false,
                evented: false,
              })),
              {
                selectable: false,
                evented: false,
                objectCaching: false,
                subTargetCheck: false,
              }
            )
          : new Rect({
              left: highlightRects[0]?.left ?? pointer.x,
              top: highlightRects[0]?.top ?? (snappedLine ? snappedLine.top - highlightPadding.y : pointer.y),
              width: highlightRects[0]?.width ?? 1,
              height: highlightRects[0]?.height ?? (
                snappedLine
                  ? snappedLine.height + highlightPadding.y * 2
                  : Math.max(18, brushSizeRef.current * 4)
              ),
              fill: highlightColor,
              stroke: "transparent",
              strokeWidth: 0,
              selectable: false,
              evented: false,
              objectCaching: false,
            });
        draftObjectRef.current = obj;
        fc.add(obj);
      } else if (activeToolRef.current === "circle") {
        const obj = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 1,
          ry: 1,
          originX: "left",
          originY: "top",
          fill: "transparent",
          stroke: drawColorRef.current,
          strokeWidth: Math.max(1, brushSizeRef.current),
          selectable: false,
          evented: false,
        });
        draftObjectRef.current = obj;
        fc.add(obj);
      } else if (activeToolRef.current === "line") {
        const obj = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: drawColorRef.current,
          strokeWidth: Math.max(1, brushSizeRef.current),
          selectable: false,
          evented: false,
        });
        draftObjectRef.current = obj;
        fc.add(obj);
      }
    });
    fc.on("mouse:move", (opt: any) => {
      // Hover outline over the nearest PDF text line while the edit-text tool is
      // active, so the user sees which line a click will edit.
      // The hover outline is transient UI: suppress history and exclude it from
      // export so it never lands in undo stack, unsaved flag, or the saved PDF.
      const removeHoverRect = () => {
        if (!hoverLineRectRef.current) return;
        suppressHistoryRef.current = true;
        try { fc.remove(hoverLineRectRef.current); } catch {}
        suppressHistoryRef.current = false;
        hoverLineRectRef.current = null;
        fc.requestRenderAll?.();
      };

      if (activeToolRef.current === "edit-text" && !draftObjectRef.current) {
        const movePointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e);
        const lines = pageTextLinesRef.current.get(pageNumber) || [];
        const hovered = movePointer ? findNearestTextLine(lines, movePointer.x, movePointer.y, 28) : null;
        if (hovered) {
          const pad = Math.max(2, hovered.fontSize * 0.15);
          if (!hoverLineRectRef.current) {
            const rect = new Rect({
              left: hovered.left - pad,
              top: hovered.top - pad,
              width: hovered.right - hovered.left + pad * 2,
              height: hovered.height + pad * 2,
              fill: "rgba(99,102,241,0.10)",
              stroke: "rgba(99,102,241,0.7)",
              strokeWidth: 1,
              selectable: false,
              evented: false,
              excludeFromExport: true,
            });
            (rect as any).data = { pdfxHoverOutline: true };
            hoverLineRectRef.current = rect;
            suppressHistoryRef.current = true;
            fc.add(rect);
            suppressHistoryRef.current = false;
          } else {
            hoverLineRectRef.current.set({
              left: hovered.left - pad,
              top: hovered.top - pad,
              width: hovered.right - hovered.left + pad * 2,
              height: hovered.height + pad * 2,
            });
          }
          fc.requestRenderAll?.();
        } else {
          removeHoverRect();
        }
      } else {
        removeHoverRect();
      }

      if (!draftStartRef.current || !draftObjectRef.current) return;
      const pointer = opt.scenePoint ?? fc.getScenePoint?.(opt.e);
      if (!pointer) return;
      const start = draftStartRef.current;
      const left = Math.min(start.x, pointer.x);
      const top = Math.min(start.y, pointer.y);
      const width = Math.max(Math.abs(pointer.x - start.x), 1);
      const height = Math.max(Math.abs(pointer.y - start.y), 1);
      const shiftPressed = Boolean(opt.e?.shiftKey);

      if (activeToolRef.current === "rect") {
        if (shiftPressed) {
          const size = Math.max(width, height);
          draftObjectRef.current.set({
            left: pointer.x >= start.x ? start.x : start.x - size,
            top: pointer.y >= start.y ? start.y : start.y - size,
            width: size,
            height: size,
          });
        } else {
          draftObjectRef.current.set({ left, top, width, height });
        }
      } else if (activeToolRef.current === "highlight") {
        const currentLines = pageTextLinesRef.current.get(pageNumber) || [];
        const endLine = resolveHighlightEndLine(currentLines, draftLineRef.current, pointer);

        if (draftLineRef.current || endLine) {
          const startLine = draftLineRef.current ?? endLine!;
          const finishLine = endLine ?? draftLineRef.current ?? startLine;
          const highlightPadding = getHighlightPadding(brushSizeRef.current);
          const rects = buildHighlightRectMetrics(
            currentLines,
            start,
            pointer,
            startLine,
            finishLine,
            highlightPadding.x,
            highlightPadding.y
          );

          if (rects.length > 0) {
            const highlightColor = hexToRgba(drawColorRef.current, highlightOpacityRef.current);
            const nextDraft = rects.length > 1
              ? new Group(
                  rects.map((rect) => new Rect({
                    ...rect,
                    fill: highlightColor,
                    stroke: "transparent",
                    strokeWidth: 0,
                    selectable: false,
                    evented: false,
                  })),
                  {
                    selectable: false,
                    evented: false,
                    objectCaching: false,
                    subTargetCheck: false,
                  }
                )
              : new Rect({
                  ...rects[0],
                  fill: highlightColor,
                  stroke: "transparent",
                  strokeWidth: 0,
                  selectable: false,
                  evented: false,
                  objectCaching: false,
                });

            fc.remove(draftObjectRef.current);
            draftObjectRef.current = nextDraft;
            fc.add(nextDraft);
          }
        } else {
          draftObjectRef.current.set({
            left,
            top,
            width: Math.max(width, 24),
            height: Math.max(height, Math.max(18, brushSizeRef.current * 4)),
          });
        }
      } else if (activeToolRef.current === "circle") {
        if (shiftPressed) {
          const size = Math.max(width, height);
          draftObjectRef.current.set({
            left: pointer.x >= start.x ? start.x : start.x - size,
            top: pointer.y >= start.y ? start.y : start.y - size,
            rx: size / 2,
            ry: size / 2,
          });
        } else {
          draftObjectRef.current.set({ left, top, rx: width / 2, ry: height / 2 });
        }
      } else if (activeToolRef.current === "line") {
        if (shiftPressed) {
          const dx = pointer.x - start.x;
          const dy = pointer.y - start.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            draftObjectRef.current.set({ x1: start.x, y1: start.y, x2: pointer.x, y2: start.y });
          } else {
            draftObjectRef.current.set({ x1: start.x, y1: start.y, x2: start.x, y2: pointer.y });
          }
        } else {
          draftObjectRef.current.set({ x1: start.x, y1: start.y, x2: pointer.x, y2: pointer.y });
        }
      }

      draftObjectRef.current.setCoords?.();
      fc.renderAll();
    });
    fc.on("mouse:out", () => {
      if (!hoverLineRectRef.current) return;
      suppressHistoryRef.current = true;
      try { fc.remove(hoverLineRectRef.current); } catch {}
      suppressHistoryRef.current = false;
      hoverLineRectRef.current = null;
      fc.requestRenderAll?.();
    });
    fc.on("mouse:up", () => {
      const draft = draftObjectRef.current;
      if (!draft) return;

      suppressHistoryRef.current = false;
      if (activeToolRef.current === "rect" && draft.width < 8 && draft.height < 8) {
        draft.set({ width: 120, height: 70 });
      } else if (
        activeToolRef.current === "highlight" &&
        draft.type !== "group" &&
        draft.width < 10
      ) {
        const line = draftLineRef.current;
        if (line) {
          const highlightPadding = getHighlightPadding(brushSizeRef.current);
          const centerX = draftStartRef.current?.x ?? draft.left ?? line.left;
          const fallbackHalfWidth = Math.max(18, Math.min(34, line.height * 1.35));
          const left = clampHighlightX(line, centerX - fallbackHalfWidth, highlightPadding.x);
          const right = clampHighlightX(line, centerX + fallbackHalfWidth, highlightPadding.x);
          draft.set({
            left,
            top: line.top - highlightPadding.y,
            width: Math.max(right - left, 36),
            height: line.height + highlightPadding.y * 2,
          });
        } else {
          draft.set({ width: 72 });
        }
      } else if (activeToolRef.current === "circle" && draft.rx < 4 && draft.ry < 4) {
        draft.set({ rx: 42, ry: 42 });
      } else if (activeToolRef.current === "line") {
        const dx = Math.abs((draft.x2 ?? 0) - (draft.x1 ?? 0));
        const dy = Math.abs((draft.y2 ?? 0) - (draft.y1 ?? 0));
        if (dx < 8 && dy < 8) {
          draft.set({ x2: (draft.x1 ?? 0) + 140, y2: draft.y1 });
        }
      }
      draft.set({ selectable: true, evented: true });
      draft.setCoords?.();
      fc.setActiveObject(draft);
      fc.renderAll();
      pushHistory();

      draftObjectRef.current = null;
      draftStartRef.current = null;
      draftLineRef.current = null;
    });

    const stored = pageStatesRef.current.get(pageNumber);
    if (stored) {
      await loadCanvasState(fc, stored);
      if (version !== initVersionRef.current) {
        fc.dispose();
        return;
      }
    }
    pushHistory();
  }, [applyCanvasCssSize, getCanvasSize, loadCanvasState, pushHistory, syncToolbarFromObject]);

  const saveCurrent = useCallback(async () => {
    if (activeTextEditorRef.current?.pageNumber === currentPage) {
      await commitTextEditor();
    }
    if (!fabricRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    pageStatesRef.current.set(currentPage, json);
  }, [commitTextEditor, currentPage]);

  // Save/export — вынесено в хук (TD-02 Phase 4)
  const { handleSave } = useEditorSave({
    fabricRef,
    pageOrigBytesRef,
    pageStatesRef,
    pageCount,
    currentPage,
    pageDims,
    file,
    pdfjsDoc,
    saveCurrent,
    isRu,
    setError,
    setIsSaving,
    setHasUnsavedChanges,
  });

  const goBack = useCallback(() => {
    void (async () => {
      await saveCurrent();
      if (hasUnsavedChanges) {
        const shouldLeave = window.confirm(
          isRu
            ? "Есть несохраненные изменения. Выйти из редактора?"
            : "You have unsaved changes. Leave the editor?"
        );
        if (!shouldLeave) return;
      }
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      setLocation("/");
    })();
  }, [hasUnsavedChanges, isRu, saveCurrent, setLocation]);

  const updateZoom = useCallback((updater: number | ((prev: number) => number)) => {
    setZoom((prev) => typeof updater === "function" ? (updater as (prev: number) => number)(prev) : updater);
  }, []);

  const openPdfPicker = useCallback((e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    if (loadingState !== "ready" || pageCount < 1) return;
    void initFabric(currentPage);
  }, [currentPage, initFabric, loadingState, pageCount]);

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose?.();
      disposeSignatureCanvas();
    };
  }, []);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    drawColorRef.current = drawColor;
  }, [drawColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    fontFamilyRef.current = fontFamily;
  }, [fontFamily]);

  useEffect(() => {
    fontColorRef.current = fontColor;
  }, [fontColor]);

  useEffect(() => {
    textBoldRef.current = textBold;
  }, [textBold]);

  useEffect(() => {
    textItalicRef.current = textItalic;
  }, [textItalic]);

  useEffect(() => {
    textUnderlineRef.current = textUnderline;
  }, [textUnderline]);

  useEffect(() => {
    textAlignRef.current = textAlign;
  }, [textAlign]);

  useEffect(() => {
    highlightOpacityRef.current = highlightOpacity;
  }, [highlightOpacity]);

  useEffect(() => {
    activeTextEditorRef.current = activeTextEditor;
  }, [activeTextEditor]);

  useEffect(() => {
    if (!activeTextEditor) return;
    const ctx = getTextMeasureContext();
    if (!ctx) return;
    const measuredWidth = measureEditorTextWidth(ctx, activeTextEditor.text || " ", activeTextEditor);
    const nextWidth = clamp(
      measuredWidth + Math.max(8, activeTextEditor.fontSize * 0.42),
      18,
      activeTextEditor.maxWidth
    );
    if (Math.abs(nextWidth - activeTextEditor.width) > 0.5) {
      setActiveTextEditor((prev) => prev ? { ...prev, width: nextWidth } : prev);
    }
  }, [activeTextEditor, getTextMeasureContext]);

  useEffect(() => {
    if (!activeTextEditor || activeTextEditor.pageNumber !== currentPage) return;
    const frame = window.requestAnimationFrame(() => {
      textEditorRef.current?.focus();
      const value = textEditorRef.current?.value ?? "";
      textEditorRef.current?.setSelectionRange(value.length, value.length);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTextEditor, currentPage]);

  useEffect(() => {
    if (!activeTextEditor || activeTextEditor.pageNumber !== currentPage || !textEditorRef.current) return;
    const el = textEditorRef.current;
    el.style.height = `${activeTextEditor.minHeight}px`;
    el.style.height = `${Math.max(activeTextEditor.minHeight, el.scrollHeight)}px`;
  }, [activeTextEditor, currentPage]);

  useEffect(() => {
    if (selectionToolbarSyncRef.current) return;
    updateSelectedObjects((obj) => {
      if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") {
        obj.set({
          fill: fontColor,
          fontSize,
          fontFamily,
          fontWeight: textBold ? "bold" : "normal",
          fontStyle: textItalic ? "italic" : "normal",
          underline: textUnderline,
          textAlign,
        });
        if (typeof (obj as any).pdfxBaseFontSize === "number") {
          (obj as any).pdfxBaseFontSize = fontSize;
        }
        fitTextObjectToBounds(obj, fontSize);
      }
    });
  }, [fontColor, fontFamily, fontSize, textAlign, textBold, textItalic, textUnderline, updateSelectedObjects]);

  useEffect(() => {
    if (selectionToolbarSyncRef.current) return;
    updateSelectedObjects((obj) => {
      if (obj.type === "rect" && obj.stroke === "transparent") {
        obj.set({ fill: hexToRgba(drawColor, highlightOpacity) });
      } else if (obj.type === "line") {
        obj.set({ stroke: drawColor, strokeWidth: Math.max(1, brushSize) });
      } else if (obj.type === "ellipse" || (obj.type === "rect" && obj.stroke !== "transparent")) {
        obj.set({ stroke: drawColor, strokeWidth: Math.max(1, brushSize) });
      } else if (obj.type === "group" && typeof obj.getObjects === "function") {
        obj.getObjects().forEach((child: any) => {
          if (child.type === "rect") {
            child.set({ fill: hexToRgba(drawColor, highlightOpacity) });
          }
        });
      }
    });
  }, [brushSize, drawColor, highlightOpacity, updateSelectedObjects]);

  useEffect(() => {
    if (!activeTextEditorRef.current) return;
    setActiveTextEditor((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        fontFamily,
        fontSize,
        fontWeight: textBold ? "bold" as const : "normal" as const,
        fontStyle: textItalic ? "italic" as const : "normal" as const,
        underline: textUnderline,
        textAlign,
        color: fontColor,
      };
      const ctx = getTextMeasureContext();
      if (!ctx) return next;
      const textMetrics = measureEditorTextMetrics(ctx, next, prev.lineHeight);
      return {
        ...next,
        lineHeight: textMetrics.lineHeight,
        minHeight: textMetrics.lineHeight,
        top: next.baselineY != null ? next.baselineY - textMetrics.baselineFromTop : next.top,
      };
    });
  }, [fontColor, fontFamily, fontSize, getTextMeasureContext, textAlign, textBold, textItalic, textUnderline]);

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


  useEffect(() => {
    if (loadingState !== "ready" || pageCount < 1) return;
    const { width, height } = getCanvasSize(currentPage);
    applyCanvasCssSize(width, height);
  }, [applyCanvasCssSize, currentPage, getCanvasSize, loadingState, pageCount, zoom]);

  const renderCurrentPage = useCallback(async () => {
    if (!pdfjsDoc || !pdfCanvasRef.current) return;

    const canvas = pdfCanvasRef.current;
    const version = ++renderVersionRef.current;
    const pageNumber = currentPage;
    const renderScale = DISPLAY_SCALE * zoom;
    const { width, height } = getCanvasSize(pageNumber);

    renderQueueRef.current = renderQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (version !== renderVersionRef.current) return;
        try {
          await renderPageToCanvas(pdfjsDoc, pageNumber, canvas, renderScale);
        } catch {
          if (version === renderVersionRef.current) {
            setError(isRu ? "Не удалось отрисовать страницу PDF" : "Failed to render PDF page");
          }
          return;
        }
        if (version !== renderVersionRef.current) return;
        applyCanvasCssSize(width, height);
        setError((prev) => (
          prev === "Failed to render PDF page" || prev === "Не удалось отрисовать страницу PDF"
            ? null
            : prev
        ));
      });

    return renderQueueRef.current;
  }, [applyCanvasCssSize, currentPage, getCanvasSize, isRu, pdfjsDoc, zoom]);

  useEffect(() => {
    if (loadingState !== "ready") return;
    void renderCurrentPage();
  }, [loadingState, renderCurrentPage]);

  const handleFile = useCallback(async (f: File) => {
    if (activeTextEditorRef.current?.pageNumber === currentPage) {
      await commitTextEditor();
    }
    if (hasUnsavedChanges && file) {
      const shouldReplace = window.confirm(
        isRu
          ? "Есть несохраненные изменения. Заменить текущий PDF?"
          : "You have unsaved changes. Replace the current PDF?"
      );
      if (!shouldReplace) return;
    }
    if (f.size > mbToBytes(MAX_EDIT_PDF_FILE_SIZE_MB)) {
      setError(
        isRu
          ? `Файл превышает лимит ${MAX_EDIT_PDF_FILE_SIZE_MB} МБ`
          : `File exceeds ${MAX_EDIT_PDF_FILE_SIZE_MB} MB limit`
      );
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
      const bytesForPdfLib = bytes.slice(0);
      const bytesForPdfJs = bytes.slice(0);
      pageOrigBytesRef.current = bytesForPdfLib;
      pageStatesRef.current.clear();
      pageTextLinesRef.current.clear();

      const pdfjs = await loadPdfJs();
      setLoadProgress(30);
      const doc = await pdfjs.getDocument({ data: new Uint8Array(bytesForPdfJs) }).promise;
      const count = doc.numPages;
      setLoadProgress(50);

      const dims: PageDims[] = [];
      const thumbs: string[] = [];
      const textLines = new Map<number, TextLineMetric[]>();
      const thumbCanvas = document.createElement("canvas");
      for (let i = 1; i <= count; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        dims.push({ width: vp.width, height: vp.height });
        textLines.set(i, await extractTextLines(page, DISPLAY_SCALE));

        const tvp = page.getViewport({ scale: THUMB_SCALE });
        thumbCanvas.width = Math.round(tvp.width);
        thumbCanvas.height = Math.round(tvp.height);
        const ctx = thumbCanvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: tvp, canvas: thumbCanvas }).promise;
        thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.6));
        setLoadProgress(50 + Math.round((i / count) * 45));
      }

      setPdfjsDoc(doc);
      pageTextLinesRef.current = textLines;
      setPageCount(count);
      setPageDims(dims);
      setThumbnails(thumbs);
      setCurrentPage(1);
      setFile(f);
      setHasSelection(false);
      setHasUnsavedChanges(false);
      setLoadProgress(100);
      setLoadingState("ready");
    } catch {
      setError(isRu ? "Не удалось загрузить PDF" : "Failed to load PDF");
      setLoadingState("idle");
    }
  }, [commitTextEditor, currentPage, file, hasUnsavedChanges, isRu]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const deleteSelectedObjects = useCallback(() => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects?.() || [];
    if (activeObjects.length === 0) return;
    activeObjects.forEach((obj: any) => fabricRef.current.remove(obj));
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    setHasSelection(false);
    setSelectionToolContext(null);
  }, []);

  const placeClonedObject = useCallback((cloned: any, offsetMultiplier = 1) => {
    if (!fabricRef.current || !cloned) return false;
    const { width, height } = getCanvasSize(currentPage);
    const scaledWidth = cloned.getScaledWidth?.() ?? cloned.width ?? 0;
    const scaledHeight = cloned.getScaledHeight?.() ?? cloned.height ?? 0;
    const offset = 18 * offsetMultiplier;
    const nextLeft = clamp((cloned.left ?? 0) + offset, 0, Math.max(0, width - scaledWidth));
    const nextTop = clamp((cloned.top ?? 0) + offset, 0, Math.max(0, height - scaledHeight));

    cloned.set({
      left: nextLeft,
      top: nextTop,
    });
    cloned.setCoords?.();
    fabricRef.current.discardActiveObject();
    fabricRef.current.add(cloned);
    fabricRef.current.setActiveObject(cloned);
    fabricRef.current.renderAll();
    setHasSelection(true);
    return true;
  }, [currentPage, getCanvasSize]);

  const insertClipboardText = useCallback(async (text: string) => {
    if (!fabricRef.current || !text.trim()) return false;
    const { Textbox } = await import("fabric");
    const { width, height } = getCanvasSize(currentPage);
    const currentLines = pageTextLinesRef.current.get(currentPage) || [];
    const pointer = { x: Math.min(width * 0.22, width - 72), y: Math.min(height * 0.18, height - 48) };
    const insertionStyle = resolveTextInsertionStyle(currentLines, pointer, {
      fontFamily: fontFamilyRef.current,
      fontSize: fontSizeRef.current,
      fontWeight: textBoldRef.current ? "bold" : "normal",
      fontStyle: textItalicRef.current ? "italic" : "normal",
    });
    const hasNearbyTextLine = currentLines.some((line) => Math.abs(line.centerY - pointer.y) <= Math.max(26, line.height));
    const obj = new Textbox(text, {
      left: insertionStyle.left,
      top: insertionStyle.top,
      fontSize: insertionStyle.fontSize,
      fill: fontColorRef.current,
      fontFamily: hasNearbyTextLine
        ? normalizeEditorFontFamily(insertionStyle.fontFamily)
        : fontFamilyRef.current,
      fontWeight: textBoldRef.current ? "bold" : insertionStyle.fontWeight,
      fontStyle: textItalicRef.current ? "italic" : insertionStyle.fontStyle,
      underline: textUnderlineRef.current,
      textAlign: textAlignRef.current,
      editable: false,
      lineHeight: 1.05,
      width: insertionStyle.maxWidth,
    });
    (obj as any).pdfxBaseFontSize = insertionStyle.fontSize;
    (obj as any).pdfxMaxWidth = insertionStyle.maxWidth;
    (obj as any).pdfxBaseTop = insertionStyle.top;
    fitTextObjectToBounds(obj, insertionStyle.fontSize);
    fabricRef.current.add(obj);
    obj.setCoords?.();
    try {
      fabricRef.current.setActiveObject?.(obj);
    } catch {
      // Ignore Fabric activation glitches and keep the inserted text visible.
    }
    fabricRef.current.requestRenderAll?.();
    setHasSelection(true);
    setHasUnsavedChanges(true);
    syncToolbarFromObject(obj);
    return true;
  }, [currentPage, getCanvasSize, syncToolbarFromObject]);

  const copySelection = useCallback(async () => {
    if (!fabricRef.current) return false;
    const activeObject = fabricRef.current.getActiveObject?.();
    if (!activeObject?.clone) return false;
    clipboardRef.current = await activeObject.clone();
    setHasClipboardObject(true);
    if ((activeObject.type === "textbox" || activeObject.type === "i-text" || activeObject.type === "text") && typeof activeObject.text === "string") {
      try {
        await navigator.clipboard?.writeText?.(activeObject.text);
      } catch {
        // Ignore clipboard API failures and keep internal object clipboard.
      }
    }
    return true;
  }, []);

  const pasteSelection = useCallback(async () => {
    if (clipboardRef.current?.clone) {
      const cloned = await clipboardRef.current.clone();
      return placeClonedObject(cloned, 1);
    }

    try {
      const text = await navigator.clipboard?.readText?.();
      if (text?.trim()) {
        return insertClipboardText(text);
      }
    } catch {
      // Ignore clipboard API failures.
    }

    return false;
  }, [insertClipboardText, placeClonedObject]);

  const duplicateSelection = useCallback(async () => {
    if (!fabricRef.current) return;
    const activeObject = fabricRef.current.getActiveObject?.();
    if (!activeObject?.clone) return;
    const cloned = await activeObject.clone();
    clipboardRef.current = cloned;
    setHasClipboardObject(true);
    placeClonedObject(cloned, 1);
  }, [placeClonedObject]);

  const moveSelectionLayer = useCallback((direction: "front" | "back") => {
    if (!fabricRef.current) return;
    const activeObject = fabricRef.current.getActiveObject?.();
    if (!activeObject) return;
    if (direction === "front") {
      fabricRef.current.bringObjectForward?.(activeObject, true);
    } else {
      fabricRef.current.sendObjectBackwards?.(activeObject, true);
    }
    activeObject.setCoords?.();
    fabricRef.current.renderAll();
    setHasUnsavedChanges(true);
    pushHistory();
  }, [pushHistory]);

  const discardActiveSelection = useCallback(() => {
    if (!fabricRef.current) return;
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    setHasSelection(false);
    setSelectionToolContext(null);
  }, []);

  const nudgeSelection = useCallback((dx: number, dy: number) => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects?.() || [];
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj: any) => {
      obj.set({
        left: clamp((obj.left ?? 0) + dx, 0, Math.max(0, getCanvasSize(currentPage).width - (obj.getScaledWidth?.() ?? obj.width ?? 0))),
        top: clamp((obj.top ?? 0) + dy, 0, Math.max(0, getCanvasSize(currentPage).height - (obj.getScaledHeight?.() ?? obj.height ?? 0))),
      });
      obj.setCoords?.();
    });

    fabricRef.current.renderAll();
    setHasUnsavedChanges(true);
    pushHistory();
  }, [currentPage, getCanvasSize, pushHistory]);

  const switchPage = useCallback((p: number) => {
    if (p === currentPage) return;
    void (async () => {
      await saveCurrent();
      setCurrentPage(p);
    })();
  }, [currentPage, saveCurrent]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const img = e.target.files?.[0];
    if (!img || !fabricRef.current) return;
    const { FabricImage } = await import("fabric");
    const { width } = getCanvasSize(currentPage);
    const url = URL.createObjectURL(img);
    const el = new window.Image();
    el.onload = async () => {
      const fi = await FabricImage.fromURL(url);
      URL.revokeObjectURL(url);
      const maxW = width * 0.4;
      if (fi.width! > maxW) fi.scaleToWidth(maxW);
      fi.set({ left: 50, top: 50 });
      fabricRef.current.add(fi);
      fabricRef.current.setActiveObject(fi);
      fabricRef.current.renderAll();
      setActiveTool("select");
    };
    el.onerror = () => URL.revokeObjectURL(url);
    el.src = url;
    e.target.value = "";
  }, [currentPage, getCanvasSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target?.closest?.("input, textarea, [contenteditable='true'], [role='textbox']")
      );
      const isEditingFabricText = Boolean(fabricRef.current?.getActiveObject?.()?.isEditing);
      if (isTypingTarget || isEditingFabricText) return;

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.code === "KeyY") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyZ")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
        e.preventDefault();
        void handleSaveRef.current?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyB") {
        e.preventDefault();
        setTextBold((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyI") {
        e.preventDefault();
        setTextItalic((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
        e.preventDefault();
        setTextUnderline((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyC" && fabricRef.current) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          void copySelection();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyV" && fabricRef.current) {
        if (clipboardRef.current) {
          e.preventDefault();
          void pasteSelection();
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyD" && fabricRef.current) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          void duplicateSelection();
          return;
        }
      }

      if ((e.key === "Delete" || e.key === "Backspace") && fabricRef.current) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          deleteSelectedObjects();
          return;
        }
      }

      if (e.key === "Escape") {
        if (fabricRef.current?.getActiveObjects?.()?.length) {
          e.preventDefault();
          discardActiveSelection();
          return;
        }
        setActiveTool("select");
        return;
      }

      if ((e.key === "Enter" || e.key === "F2") && fabricRef.current) {
        const activeObject = fabricRef.current.getActiveObject?.();
        if (activeObject && isEditableTextObject(activeObject)) {
          e.preventDefault();
          openTextObjectEditor(currentPage, activeObject);
          return;
        }
      }

      if (fabricRef.current && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const activeObjects = fabricRef.current.getActiveObjects?.() || [];
        if (activeObjects.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          if (e.key === "ArrowUp") nudgeSelection(0, -step);
          if (e.key === "ArrowDown") nudgeSelection(0, step);
          if (e.key === "ArrowLeft") nudgeSelection(-step, 0);
          if (e.key === "ArrowRight") nudgeSelection(step, 0);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyF") {
        e.preventDefault();
        setFindOpen((prev) => {
          if (!prev) { setTimeout(() => findInputRef.current?.focus(), 50); }
          return !prev;
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyA" && fabricRef.current) {
        const objects = fabricRef.current.getObjects?.() || [];
        if (objects.length > 0) {
          e.preventDefault();
          import("fabric").then(({ ActiveSelection }) => {
            fabricRef.current?.discardActiveObject?.();
            const sel = new ActiveSelection(objects, { canvas: fabricRef.current });
            fabricRef.current?.setActiveObject(sel);
            fabricRef.current?.requestRenderAll?.();
          });
        }
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const code = e.code;
      if (code === "KeyV") {
        setActiveTool("select");
      } else if (code === "KeyT") {
        setActiveTool("text");
      } else if (code === "KeyB") {
        setActiveTool("draw");
      } else if (code === "KeyH") {
        setActiveTool("highlight");
      } else if (code === "KeyR") {
        setActiveTool("rect");
      } else if (code === "KeyC") {
        setActiveTool("circle");
      } else if (code === "KeyL") {
        setActiveTool("line");
      } else if (code === "KeyE") {
        setActiveTool("eraser");
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [copySelection, currentPage, deleteSelectedObjects, discardActiveSelection, duplicateSelection, handleRedo, handleUndo, nudgeSelection, openTextObjectEditor, pasteSelection]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const toolButtons: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: t.tools.select },
    { id: "text", icon: Type, label: t.tools.text },
    { id: "edit-text", icon: TextCursorInput, label: t.tools.editText },
    { id: "draw", icon: Pencil, label: t.tools.draw },
    { id: "image", icon: ImageIcon, label: t.tools.image },
    { id: "sign", icon: PenLine, label: t.tools.sign },
    { id: "rect", icon: Square, label: t.tools.rect },
    { id: "circle", icon: Circle, label: t.tools.circle },
    { id: "line", icon: Minus, label: t.tools.line },
    { id: "highlight", icon: Highlighter, label: t.tools.highlight },
    { id: "eraser", icon: Eraser, label: t.tools.eraser },
  ];

  const COLORS = EDITOR_COLORS;

  if (loadingState === "idle" || loadingState === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" onClick={goBack}>
              <ArrowLeft className="size-4" />
              {isRu ? "Все инструменты" : "All tools"}
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="mb-2 text-3xl font-bold text-foreground">{t.title}</h1>
              <p className="text-muted-foreground">
                {isRu
                  ? "Добавляйте текст, рисунки, подписи и фигуры прямо в браузере. Файл не отправляется на сервер."
                  : "Add text, drawings, signatures and shapes directly in the browser. File never leaves your device."}
              </p>
            </div>

            {loadingState === "loading" ? (
              <div
                className="pdfx-panel rounded-2xl p-12 text-center"
              >
                <Loader2 className="size-10 text-blue-400 mx-auto mb-4 animate-spin" />
                <p className="mb-2 font-medium text-foreground">{isRu ? "Загрузка PDF…" : "Loading PDF…"}</p>
                <div className="w-full max-w-xs mx-auto rounded-full h-2 bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{loadProgress}%</p>
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-2xl border-2 border-dashed transition-colors duration-200 cursor-pointer",
                  isDragging
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border hover:border-primary/40"
                )}
                style={isDragging ? undefined : { background: "var(--pdfx-panel)" }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={openPdfPicker}
                data-testid="dropzone-edit-pdf"
              >
                <div className="p-16 text-center">
                  <div
                    className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                  >
                    <Upload className="size-8 text-white" />
                  </div>
                  <p className="mb-1 font-medium text-foreground">{t.upload}</p>
                  <button
                    type="button"
                    onClick={openPdfPicker}
                    className="font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {t.choose}
                  </button>
                  <p className="mt-2 text-sm text-muted-foreground">{t.limit} · PDF</p>
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
              className="pdfx-panel rounded-2xl p-5"
            >
              <h3 className="mb-4 font-semibold text-foreground">{t.howToUse}</h3>
              <ol className="space-y-3">
                {t.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted-foreground">{isRu ? "Похожие инструменты" : "Related tools"}</p>
                <div className="flex flex-col gap-2">
                  {[
                    { slug: "sign-pdf", label: isRu ? "Подписать PDF" : "Sign PDF" },
                    { slug: "watermark-pdf", label: isRu ? "Водяной знак" : "Watermark PDF" },
                    { slug: "protect-pdf", label: isRu ? "Защитить PDF" : "Protect PDF" },
                  ].map(({ slug, label }) => (
                    <Link key={slug} href={`/tools/${slug}`}>
                      <div className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
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
        {/* Left sidebar: thumbnails — hidden on mobile, scrollable drawer */}
        <div
          className="hidden md:flex w-44 flex-shrink-0 flex-col overflow-y-auto"
          style={{ background: "var(--pdfx-editor-rail)", borderRight: "1px solid var(--pdfx-panel-border)" }}
        >
          <div className="sticky top-0 z-10 p-2 px-3 py-3 text-xs font-medium text-muted-foreground"
            style={{ background: "var(--pdfx-editor-toolbar)", borderBottom: "1px solid var(--pdfx-panel-border)" }}>
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
            className="flex items-center gap-1 px-2 md:px-3 py-2 flex-nowrap overflow-x-auto md:flex-wrap md:overflow-x-visible [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ background: "var(--pdfx-editor-toolbar)", borderBottom: "1px solid var(--pdfx-panel-border)" }}
          >
            <button
              onClick={goBack}
              className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label={isRu ? "Назад" : "Back"}
            >
              <ArrowLeft className="size-4" />
            </button>

            {/* Mobile: thumbnails drawer toggle */}
            <button
              onClick={() => setMobileThumbsOpen(true)}
              className="md:hidden mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label={isRu ? "Страницы" : "Pages"}
            >
              <Layers className="size-4" />
            </button>

            <div className="w-px h-6 mr-1 shrink-0 bg-white/10" />

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

            {(activeTool === "draw" || activeTool === "highlight" || activeTool === "rect" || activeTool === "circle" || activeTool === "line" || selectionToolContext === "stroke" || selectionToolContext === "highlight") && (
              <div className="ml-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isRu ? "Толщина" : "Size"}
                </span>
                <input
                  type="range"
                  min={1}
                  max={activeTool === "highlight" ? 12 : 24}
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-20 accent-yellow-400"
                />
                <span className="w-5 text-center text-xs text-slate-300">{brushSize}</span>
              </div>
            )}

            {(activeTool === "text" || activeTool === "edit-text" || selectionToolContext === "text") && (
              <div className="ml-2 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isRu ? "Шрифт" : "Font"}
                </span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as (typeof EDITOR_FONT_FAMILIES)[number])}
                  className="h-8 rounded-md border border-white/10 bg-slate-950/70 px-2 text-xs text-slate-100 outline-none"
                >
                  {EDITOR_FONT_FAMILIES.map((family) => (
                    <option key={family} value={family}>{family}</option>
                  ))}
                </select>
                <input
                  type="range"
                  min={1}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-20 accent-blue-400"
                />
                <span className="w-7 text-center text-xs text-slate-300">{fontSize}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTextBold((prev) => !prev)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all",
                      textBold ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    aria-label={isRu ? "Жирный" : "Bold"}
                  >
                    <Bold className="size-4" />
                  </button>
                  <button
                    onClick={() => setTextItalic((prev) => !prev)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all",
                      textItalic ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    aria-label={isRu ? "Курсив" : "Italic"}
                  >
                    <Italic className="size-4" />
                  </button>
                  <button
                    onClick={() => setTextUnderline((prev) => !prev)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md transition-all",
                      textUnderline ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    aria-label={isRu ? "Подчеркнутый" : "Underline"}
                  >
                    <Underline className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { value: "left", icon: AlignLeft, label: isRu ? "По левому краю" : "Align left" },
                    { value: "center", icon: AlignCenter, label: isRu ? "По центру" : "Align center" },
                    { value: "right", icon: AlignRight, label: isRu ? "По правому краю" : "Align right" },
                    { value: "justify", icon: AlignJustify, label: isRu ? "По ширине" : "Justify" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTextAlign(value as TextAlignOption)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md transition-all",
                        textAlign === value ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                      aria-label={label}
                    >
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(activeTool === "highlight" || selectionToolContext === "highlight") && (
              <div className="ml-2 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isRu ? "Прозр." : "Opacity"}
                </span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={Math.round(highlightOpacity * 100)}
                  onChange={(e) => setHighlightOpacity(parseInt(e.target.value, 10) / 100)}
                  className="w-20 accent-yellow-400"
                />
                <span className="w-8 text-center text-xs text-slate-300">{Math.round(highlightOpacity * 100)}%</span>
              </div>
            )}

            <div className="w-px h-6 mx-1 bg-white/10" />

            {(hasSelection || hasClipboardObject) && (
              <>
                <div className="flex items-center gap-1 rounded-lg bg-white/5 px-1 py-1">
                  <button
                    onClick={() => void pasteSelection()}
                    disabled={!hasClipboardObject}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Вставить объект" : "Paste object"}
                  >
                    <ClipboardPaste className="size-4" />
                  </button>
                  <button
                    onClick={duplicateSelection}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Дублировать объект" : "Duplicate object"}
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    onClick={() => moveSelectionLayer("front")}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Поднять слой" : "Bring forward"}
                  >
                    <ChevronsUp className="size-4" />
                  </button>
                  <button
                    onClick={() => moveSelectionLayer("back")}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Опустить слой" : "Send backward"}
                  >
                    <ChevronsDown className="size-4" />
                  </button>
                  <button
                    onClick={deleteSelectedObjects}
                    disabled={!hasSelection}
                    className="flex size-9 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                    aria-label={isRu ? "Удалить объект" : "Delete object"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="w-px h-6 mx-1 bg-white/10" />
              </>
            )}

            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  data-testid="button-undo"
                  className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
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
                  disabled={!canRedo}
                  data-testid="button-redo"
                  className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
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
                onClick={() => updateZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                data-testid="button-zoom-out"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="text-slate-300 text-xs w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => updateZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                data-testid="button-zoom-in"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={() => updateZoom(1)}
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

          {error && (
            <div className="mx-3 mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mx-3 mt-2 flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <span className={cn("font-medium", hasUnsavedChanges ? "text-amber-300" : "text-emerald-300")}>
              {hasUnsavedChanges
                ? (isRu ? "Есть несохраненные изменения" : "Unsaved changes")
                : (isRu ? "Все изменения сохранены локально" : "All changes are saved locally")}
            </span>
            <span className="hidden md:inline text-slate-400">
              {isRu ? "Горячие клавиши:" : "Hotkeys:"} `V` {isRu ? "выбор" : "select"}, `T` {isRu ? "текст" : "text"}, `B` {isRu ? "кисть" : "draw"}, `H` {isRu ? "маркер" : "highlight"}, `R/C/L` {isRu ? "фигуры" : "shapes"}, `Ctrl+Z/Y` {isRu ? "отмена/повтор" : "undo/redo"}, `Ctrl+F` {isRu ? "поиск" : "find"}, `Ctrl+A` {isRu ? "выделить всё" : "select all"}, `Del` {isRu ? "удалить" : "delete"}, `Ctrl+S` {isRu ? "сохранить" : "save"}
            </span>
          </div>

              {/* ===== FIND & REPLACE PANEL ===== */}
              {findOpen && (
                <div
                  className="sticky top-0 z-20 flex items-center flex-wrap gap-2 px-3 py-2 border-b"
                  style={{ background: "var(--pdfx-editor-toolbar)", borderColor: "var(--pdfx-panel-border)" }}
                >
                  {/* Search input */}
                  <div className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2">
                    <Search className="size-3.5 text-slate-400 shrink-0" />
                    <input
                      ref={findInputRef}
                      type="text"
                      value={findQuery}
                      placeholder={isRu ? "Найти…" : "Find…"}
                      className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none w-40 py-1"
                      onChange={(e) => {
                        setFindQuery(e.target.value);
                        void findInPage(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); void navigateFindMatch(e.shiftKey ? -1 : 1); }
                        if (e.key === "Escape") { e.preventDefault(); setFindOpen(false); clearFindHighlights(); }
                      }}
                    />
                    {findMatches.length > 0 && (
                      <span className="text-[10px] text-slate-400 shrink-0 pr-1">
                        {findCurrent + 1}/{findMatches.length}
                      </span>
                    )}
                  </div>
                  {/* Navigate */}
                  <button
                    onClick={() => void navigateFindMatch(-1)}
                    disabled={findMatches.length === 0}
                    className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                    title={isRu ? "Предыдущее" : "Previous"}
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    onClick={() => void navigateFindMatch(1)}
                    disabled={findMatches.length === 0}
                    className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
                    title={isRu ? "Следующее" : "Next"}
                  >
                    <ChevronDown className="size-4" />
                  </button>
                  <div className="w-px h-5 bg-white/10" />
                  {/* Replace input */}
                  <div className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2">
                    <input
                      type="text"
                      value={replaceText}
                      placeholder={isRu ? "Заменить на…" : "Replace with…"}
                      className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none w-36 py-1"
                      onChange={(e) => setReplaceText(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => void replaceCurrentMatch()}
                    disabled={findMatches.length === 0}
                    className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 text-xs text-slate-200 disabled:opacity-30 transition-all"
                  >
                    {isRu ? "Заменить" : "Replace"}
                  </button>
                  <button
                    onClick={() => void replaceAllMatches()}
                    disabled={findMatches.length === 0}
                    className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 text-xs text-slate-200 disabled:opacity-30 transition-all"
                  >
                    {isRu ? "Заменить все" : "Replace all"}
                  </button>
                  <div className="w-px h-5 bg-white/10" />
                  <button
                    onClick={() => { setFindOpen(false); clearFindHighlights(); setFindQuery(""); setFindMatches([]); }}
                    className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                  {findQuery && findMatches.length === 0 && (
                    <span className="text-xs text-slate-500 ml-1">{isRu ? "Не найдено" : "No matches"}</span>
                  )}
                </div>
              )}
          {/* Canvas area */}
          <div className="flex-1 overflow-auto" style={{ background: "var(--pdfx-editor-bg)" }}>
            <div className="flex items-start justify-center min-h-full p-3 md:p-6">
              <div
                className="relative shadow-2xl"
                style={{ width: canvasW, height: canvasH, cursor: activeTool === "text" || activeTool === "edit-text" || activeTool === "rect" || activeTool === "circle" || activeTool === "line" || activeTool === "highlight" ? "crosshair" : undefined }}
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
                {activeTextEditor && activeTextEditor.pageNumber === currentPage && (
                  <textarea
                    ref={textEditorRef}
                    value={activeTextEditor.text}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      setActiveTextEditor((prev) => prev ? { ...prev, text: nextText } : prev);
                      setHasUnsavedChanges(true);
                    }}
                    onBlur={() => {
                      void commitTextEditor();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelTextEditor();
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyB") {
                        e.preventDefault();
                        setTextBold((prev) => !prev);
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyI") {
                        e.preventDefault();
                        setTextItalic((prev) => !prev);
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyU") {
                        e.preventDefault();
                        setTextUnderline((prev) => !prev);
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
                        e.preventDefault();
                        void commitTextEditor().then((saved) => {
                          if (saved) {
                            void handleSaveRef.current?.();
                          }
                        });
                        return;
                      }
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        void commitTextEditor();
                      }
                    }}
                    spellCheck={false}
                    className="absolute resize-none overflow-hidden border-0 outline-none"
                    style={{
                      left: activeTextEditor.left,
                      top: activeTextEditor.top,
                      width: activeTextEditor.width,
                      minHeight: activeTextEditor.minHeight,
                      maxWidth: activeTextEditor.maxWidth,
                      padding: 0,
                      margin: 0,
                      background: activeTextEditor.backgroundColor,
                      boxSizing: "border-box",
                      color: activeTextEditor.color,
                      fontFamily: activeTextEditor.fontFamily,
                      fontSize: activeTextEditor.fontSize,
                      fontWeight: activeTextEditor.fontWeight,
                      fontStyle: activeTextEditor.fontStyle,
                      textAlign: activeTextEditor.textAlign,
                      lineHeight: `${activeTextEditor.lineHeight}px`,
                      textDecoration: activeTextEditor.underline ? "underline" : "none",
                      letterSpacing: "0px",
                      fontKerning: "normal",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "break-word",
                      transform: "translateZ(0)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile thumbnails drawer */}
      {mobileThumbsOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileThumbsOpen(false)}
          />
          <div
            className="relative flex w-64 max-w-[80vw] flex-col overflow-y-auto"
            style={{ background: "var(--pdfx-editor-rail)", borderRight: "1px solid var(--pdfx-panel-border)" }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 text-xs font-medium text-muted-foreground"
              style={{ background: "var(--pdfx-editor-toolbar)", borderBottom: "1px solid var(--pdfx-panel-border)" }}
            >
              <span>{pageCount} {isRu ? "страниц" : "pages"}</span>
              <button
                onClick={() => setMobileThumbsOpen(false)}
                className="flex size-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label={isRu ? "Закрыть" : "Close"}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {thumbnails.map((src, i) => (
                <button
                  key={i}
                  onClick={() => { switchPage(i + 1); setMobileThumbsOpen(false); }}
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
        </div>
      )}

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
                onClick={clearSignaturePad}
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
