// ============================================================
// PDF Worker — протокол сообщений между main thread и Web Worker
// ============================================================
//
// Общие типы для worker-client.ts (main thread) и pdf-worker.ts (worker).
// Держим их отдельно, чтобы main thread не тянул код самого воркера.

/**
 * Операции, которые умеет выполнять воркер.
 *
 * Маршрутизируются из tool-page (через runPdfTask с fallback): grayscalePdf,
 * invertColors, pdfToImages, scannerEffect, removeBlankPages, nUpPdf,
 * toSinglePage, bookletImposition, comparePdf, autoRedactPdf, pdfDiff.
 *
 * Для двухфайловых операций (comparePdf, pdfDiff) второй файл передаётся в
 * args[0] — структурное клонирование File поддерживается postMessage.
 *
 * pdfToPptx (pptxgenjs зависит от DOM) и ocrPdf (tesseract.js создаёт
 * вложенные воркеры) объявлены здесь, но пока выполняются в main thread —
 * перенос отдельным этапом после проверки совместимости.
 */
export type WorkerOp =
  | "grayscalePdf"
  | "invertColors"
  | "pdfToImages"
  | "scannerEffect"
  | "removeBlankPages"
  | "nUpPdf"
  | "toSinglePage"
  | "bookletImposition"
  | "comparePdf"
  | "autoRedactPdf"
  | "pdfDiff"
  | "pdfToPptx"
  | "ocrPdf";

/** Запрос на выполнение операции. file и args передаются structured-clone. */
export interface WorkerRequest {
  id: number;
  op: WorkerOp;
  file: File;
  /** Доп. аргументы функции (после file, перед onProgress). Зависит от op. */
  args: unknown[];
}

export interface ProgressMessage {
  id: number;
  type: "progress";
  pct: number;
}

export interface DoneMessage {
  id: number;
  type: "done";
  result: unknown;
}

export interface ErrorMessage {
  id: number;
  type: "error";
  message: string;
}

export type WorkerResponse = ProgressMessage | DoneMessage | ErrorMessage;
