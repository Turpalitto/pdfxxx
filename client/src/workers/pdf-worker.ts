// ============================================================
// PDF Worker — выполняет тяжёлые PDF-операции вне main thread
// ============================================================
//
// Воркер импортирует функции из pdf-utils как есть. Эти функции используют
// canvas-абстракцию (createRenderCanvas), которая в воркере выбирает
// OffscreenCanvas вместо document.createElement — поэтому один и тот же код
// работает и здесь, и в main thread.
//
// Прогресс отправляется обратно как ProgressMessage, результат — DoneMessage
// (Uint8Array передаётся через transferable buffer), ошибки — ErrorMessage.
//
// Отмена операции выполняется на стороне main thread через worker.terminate()
// (см. worker-client.ts) — это надёжно прерывает pdfjs/pdf-lib в любой точке.

import * as pdfUtils from "../lib/pdf-utils";
import type { WorkerRequest, WorkerResponse } from "./pdf-worker-types";

// В tsconfig подключён lib "dom", а не "webworker", поэтому self типизирован
// как Window. Приводим к минимальному интерфейсу воркера, чтобы получить
// корректную сигнатуру postMessage(message, transfer) без конфликта либ.
interface WorkerCtx {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
  onmessage: ((ev: MessageEvent<WorkerRequest>) => void) | null;
}
const ctx = self as unknown as WorkerCtx;

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, op, file, args } = e.data;
  const onProgress = (pct: number) => ctx.postMessage({ id, type: "progress", pct });

  try {
    let result: unknown;
    switch (op) {
      case "grayscalePdf":
        result = await pdfUtils.grayscalePdf(file, onProgress);
        break;
      case "invertColors":
        result = await pdfUtils.invertColors(file, onProgress);
        break;
      case "pdfToImages":
        result = await pdfUtils.pdfToImages(
          file,
          (args[0] as "jpg" | "png") ?? "jpg",
          (args[1] as number) ?? 2
        );
        break;
      case "scannerEffect":
        result = await pdfUtils.scannerEffect(file, (args[0] as number) ?? 0.5, onProgress);
        break;
      case "removeBlankPages":
        result = await pdfUtils.removeBlankPages(file, (args[0] as number) ?? 240, onProgress);
        break;
      case "nUpPdf":
        result = await pdfUtils.nUpPdf(file, (args[0] as 2 | 4) ?? 2, onProgress);
        break;
      case "toSinglePage":
        result = await pdfUtils.toSinglePage(file, onProgress);
        break;
      case "bookletImposition":
        result = await pdfUtils.bookletImposition(file, onProgress);
        break;
      case "comparePdf":
        // Второй файл приходит в args[0] (structured-clone File).
        result = await pdfUtils.comparePdf(file, args[0] as File, onProgress);
        break;
      case "autoRedactPdf":
        result = await pdfUtils.autoRedactPdf(
          file,
          args[0] as Parameters<typeof pdfUtils.autoRedactPdf>[1],
          onProgress
        );
        break;
      case "pdfDiff":
        result = await pdfUtils.pdfDiff(file, args[0] as File, onProgress);
        break;
      case "pdfToPptx":
        result = await pdfUtils.pdfToPptx(file, onProgress);
        break;
      case "ocrPdf":
        result = await pdfUtils.ocrPdf(file, (args[0] as string) ?? "eng", onProgress);
        break;
      default:
        throw new Error(`Unknown worker op: ${op}`);
    }

    // Uint8Array отдаём с transfer — без копирования большого буфера.
    const transfer: Transferable[] =
      result instanceof Uint8Array ? [result.buffer as Transferable] : [];
    ctx.postMessage({ id, type: "done", result }, transfer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ id, type: "error", message });
  }
};
