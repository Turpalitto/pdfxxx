import { useCallback } from "react";
import type { MutableRefObject } from "react";
import { PDFDocument } from "pdf-lib";
import { DISPLAY_SCALE } from "@/lib/edit-pdf-types";
import { dataUrlToBytes } from "@/lib/edit-pdf-utils";

interface UseEditorSaveParams {
  fabricRef: MutableRefObject<any>;
  pageOrigBytesRef: MutableRefObject<ArrayBuffer | null>;
  pageStatesRef: MutableRefObject<Map<number, string>>;
  pageCount: number;
  currentPage: number;
  pageDims: { width: number; height: number }[];
  file: File | null;
  pdfjsDoc: any;
  saveCurrent: () => Promise<void>;
  isRu: boolean;
  setError: (err: string | null) => void;
  setIsSaving: (v: boolean) => void;
  setHasUnsavedChanges: (v: boolean) => void;
}

export function useEditorSave({
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
}: UseEditorSaveParams) {
  const handleSave = useCallback(async () => {
    if (!pageOrigBytesRef.current) {
      setError(
        isRu
          ? "Не удалось подготовить исходный PDF. Перезагрузите файл и попробуйте снова."
          : "Failed to prepare source PDF. Please re-upload and try again."
      );
      return;
    }
    if (!pdfjsDoc || pageCount < 1) {
      setError(
        isRu
          ? "PDF еще загружается. Попробуйте снова через секунду."
          : "PDF is still loading. Try again in a moment."
      );
      return;
    }
    setError(null);
    setIsSaving(true);
    await saveCurrent();

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
      setHasUnsavedChanges(false);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [pageCount, currentPage, pageDims, file, pdfjsDoc, saveCurrent, isRu]);

  return { handleSave };
}