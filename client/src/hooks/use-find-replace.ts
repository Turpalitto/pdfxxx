import { useCallback, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { FindMatch, TextLineMetric } from "@/lib/edit-pdf-types";
import { normalizeEditorFontFamily } from "@/lib/edit-pdf-utils";

interface UseFindReplaceParams {
  fabricRef: MutableRefObject<any>;
  pageTextLinesRef: MutableRefObject<Map<number, TextLineMetric[]>>;
  textMeasureCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  currentPage: number;
  pushHistory: () => void;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
}

/**
 * Find & Replace for the PDF editor (TD-02 Phase 2 extraction from
 * edit-pdf-page.tsx). Encapsulates the search state, canvas highlight rects and
 * the precise measureText-based mask/replacement logic (TD-11). Behaviour is a
 * verbatim port — see edit-pdf-page.tsx history for the original.
 */
export function useFindReplace({
  fabricRef,
  pageTextLinesRef,
  textMeasureCanvasRef,
  currentPage,
  pushHistory,
  setHasUnsavedChanges,
}: UseFindReplaceParams) {
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [findMatches, setFindMatches] = useState<FindMatch[]>([]);
  const [findCurrent, setFindCurrent] = useState(0);
  const [findHighlightObjs, setFindHighlightObjs] = useState<any[]>([]);
  const findInputRef = useRef<HTMLInputElement>(null);

  const clearFindHighlights = useCallback(() => {
    if (!fabricRef.current) return;
    setFindHighlightObjs((prev) => {
      prev.forEach((obj) => { try { fabricRef.current?.remove(obj); } catch {} });
      return [];
    });
    fabricRef.current.requestRenderAll?.();
  }, []);

  // Точные измерения текста через canvas measureText с реальным шрифтом строки.
  // character-ratio (idx/text.length) неточен для пропорциональных шрифтов —
  // маска не покрывает глифы. measureText даёт настоящую ширину префикса/сегмента.
  const getLineMeasure = useCallback((line: TextLineMetric) => {
    if (!textMeasureCanvasRef.current) {
      textMeasureCanvasRef.current = document.createElement("canvas");
    }
    const ctx = textMeasureCanvasRef.current.getContext("2d");
    if (!ctx) return null;
    const style = line.fontStyle === "italic" ? "italic" : "normal";
    const weight = line.fontWeight === "bold" ? "bold" : "normal";
    ctx.font = `${style} ${weight} ${line.fontSize}px ${normalizeEditorFontFamily(line.fontFamily)}`;
    const fullW = ctx.measureText(line.text).width;
    const renderWidth = line.right - line.left;
    // Нормируем measureText к фактической ширине строки (шрифт может отличаться от PDF)
    const scale = fullW && isFinite(fullW) && fullW > 0 ? renderWidth / fullW : 1;
    return { ctx, scale };
  }, []);

  const measureMatchRect = useCallback((line: TextLineMetric, segStart: number, segEnd: number) => {
    const renderWidth = line.right - line.left;
    const lm = getLineMeasure(line);
    if (!lm) {
      // Fallback на character-ratio, если canvas-контекст недоступен
      const r1 = segStart / Math.max(line.text.length, 1);
      const r2 = segEnd / Math.max(line.text.length, 1);
      return { left: line.left + renderWidth * r1, width: Math.max(renderWidth * (r2 - r1), 4) };
    }
    const prefixW = lm.ctx.measureText(line.text.slice(0, segStart)).width * lm.scale;
    const segW = lm.ctx.measureText(line.text.slice(segStart, segEnd)).width * lm.scale;
    return { left: line.left + prefixW, width: Math.max(segW, 4) };
  }, [getLineMeasure]);

  const findInPage = useCallback(async (query: string) => {
    clearFindHighlights();
    if (!query.trim() || !fabricRef.current) { setFindMatches([]); setFindCurrent(0); return; }
    const lines = pageTextLinesRef.current.get(currentPage) ?? [];
    const lq = query.toLowerCase();
    const matches: FindMatch[] = [];

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const lt = line.text.toLowerCase();
      let idx = 0;
      while ((idx = lt.indexOf(lq, idx)) !== -1) {
        const seg = measureMatchRect(line, idx, idx + query.length);
        matches.push({
          lineIdx: li, segStart: idx, segEnd: idx + query.length,
          text: line.text.slice(idx, idx + query.length),
          left: seg.left, top: line.top, width: Math.max(seg.width, 8), height: line.height,
        });
        idx += query.length;
      }
    }

    // Draw highlight rects on canvas
    const { Rect } = await import("fabric");
    const objs: any[] = [];
    for (let mi = 0; mi < matches.length; mi++) {
      const m = matches[mi];
      const isCurrent = mi === 0;
      const rect = new Rect({
        left: m.left,
        top: m.top,
        width: m.width,
        height: m.height,
        fill: isCurrent ? "rgba(255,165,0,0.45)" : "rgba(255,235,59,0.35)",
        stroke: isCurrent ? "#e67e00" : "transparent",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        data: { findHighlight: true, matchIndex: mi },
      });
      objs.push(rect);
      fabricRef.current.add(rect);
    }
    fabricRef.current.requestRenderAll?.();
    setFindMatches(matches);
    setFindHighlightObjs(objs);
    setFindCurrent(0);
  }, [clearFindHighlights, currentPage, measureMatchRect]);

  const navigateFindMatch = useCallback(async (direction: 1 | -1) => {
    if (findMatches.length === 0 || !fabricRef.current) return;
    const next = (findCurrent + direction + findMatches.length) % findMatches.length;
    // Recolor all highlights
    findHighlightObjs.forEach((obj, i) => {
      obj.set({
        fill: i === next ? "rgba(255,165,0,0.45)" : "rgba(255,235,59,0.35)",
        stroke: i === next ? "#e67e00" : "transparent",
      });
    });
    fabricRef.current.requestRenderAll?.();
    setFindCurrent(next);
  }, [findCurrent, findHighlightObjs, findMatches.length]);

  const replaceCurrentMatch = useCallback(async () => {
    if (findMatches.length === 0 || !fabricRef.current) return;
    const { Rect, Textbox } = await import("fabric");
    const m = findMatches[findCurrent];
    const lines = pageTextLinesRef.current.get(currentPage) ?? [];
    const line = lines[m.lineIdx];
    if (!line) return;

    // White mask over original text
    const mask = new Rect({
      left: m.left,
      top: m.top,
      width: m.width,
      height: m.height,
      fill: "#ffffff",
      stroke: "transparent",
      selectable: false,
      evented: false,
      data: { pdfxReplacement: true },
    });
    // New text object
    const lm = getLineMeasure(line);
    const replWidth = lm
      ? Math.max(m.width, lm.ctx.measureText(replaceText || " ").width)
      : Math.max(m.width, replaceText.length * (line.fontSize ?? 12) * 0.6);
    const textObj = new Textbox(replaceText, {
      left: m.left,
      top: m.top,
      fontSize: line.fontSize ?? 12,
      fontFamily: normalizeEditorFontFamily(line.fontFamily ?? "Arial"),
      fontWeight: line.fontWeight ?? "normal",
      fontStyle: (line.fontStyle as any) ?? "normal",
      fill: "#000000",
      width: replWidth,
      editable: false,
      selectable: true,
      evented: true,
    });
    (textObj as any).pdfxBaseFontSize = line.fontSize ?? 12;
    (textObj as any).pdfxMaxWidth = textObj.width;

    fabricRef.current.add(mask);
    fabricRef.current.add(textObj);
    fabricRef.current.requestRenderAll?.();
    setHasUnsavedChanges(true);
    pushHistory();

    // Remove the match from list and its highlight object
    const newMatches = findMatches.filter((_, i) => i !== findCurrent);
    const removedHighlight = findHighlightObjs[findCurrent];
    if (removedHighlight) { try { fabricRef.current.remove(removedHighlight); } catch {} }
    const newHighlights = findHighlightObjs.filter((_, i) => i !== findCurrent);
    // Recolor remaining
    const nextIdx = Math.min(findCurrent, newMatches.length - 1);
    newHighlights.forEach((obj, i) => {
      obj.set({
        fill: i === nextIdx ? "rgba(255,165,0,0.45)" : "rgba(255,235,59,0.35)",
        stroke: i === nextIdx ? "#e67e00" : "transparent",
      });
    });
    fabricRef.current.requestRenderAll?.();
    setFindMatches(newMatches);
    setFindHighlightObjs(newHighlights);
    setFindCurrent(nextIdx >= 0 ? nextIdx : 0);
  }, [currentPage, findCurrent, findHighlightObjs, findMatches, pushHistory, replaceText, getLineMeasure]);

  const replaceAllMatches = useCallback(async () => {
    if (findMatches.length === 0 || !fabricRef.current) return;
    const { Rect, Textbox } = await import("fabric");
    const lines = pageTextLinesRef.current.get(currentPage) ?? [];

    for (const m of findMatches) {
      const line = lines[m.lineIdx];
      if (!line) continue;
      const mask = new Rect({
        left: m.left, top: m.top, width: m.width, height: m.height,
        fill: "#ffffff", stroke: "transparent",
        selectable: false, evented: false,
        data: { pdfxReplacement: true },
      });
      const lm = getLineMeasure(line);
      const replWidth = lm
        ? Math.max(m.width, lm.ctx.measureText(replaceText || " ").width)
        : Math.max(m.width, replaceText.length * (line.fontSize ?? 12) * 0.6);
      const textObj = new Textbox(replaceText, {
        left: m.left, top: m.top,
        fontSize: line.fontSize ?? 12,
        fontFamily: normalizeEditorFontFamily(line.fontFamily ?? "Arial"),
        fontWeight: line.fontWeight ?? "normal",
        fontStyle: (line.fontStyle as any) ?? "normal",
        fill: "#000000",
        width: replWidth,
        editable: false, selectable: true, evented: true,
      });
      (textObj as any).pdfxBaseFontSize = line.fontSize ?? 12;
      (textObj as any).pdfxMaxWidth = textObj.width;
      fabricRef.current.add(mask);
      fabricRef.current.add(textObj);
    }
    fabricRef.current.requestRenderAll?.();
    setHasUnsavedChanges(true);
    pushHistory();
    clearFindHighlights();
    setFindMatches([]);
    setFindCurrent(0);
  }, [clearFindHighlights, currentPage, findMatches, pushHistory, replaceText, getLineMeasure]);

  return {
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
  };
}
