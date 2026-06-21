// ============================================================
// PDF Worker Client — main-thread обёртка над pdf-worker.ts
// ============================================================
//
// Предоставляет runPdfTask() — запускает операцию в воркере, прокидывает
// прогресс и поддерживает отмену через AbortSignal. Если воркер недоступен
// или упал — автоматически выполняет fallback (старую функцию в main thread),
// поэтому корректность результата гарантирована: воркер это оптимизация UX,
// а не единственный путь.

import type { WorkerOp, WorkerRequest, WorkerResponse } from "./pdf-worker-types";

export interface WorkerRuntimeCapabilities {
  Worker?: unknown;
  OffscreenCanvas?: unknown;
  URL?: unknown;
}

/** Воркер пригоден, только если есть и Worker, и OffscreenCanvas (для рендера). */
export function canUsePdfWorker(capabilities: WorkerRuntimeCapabilities): boolean {
  return (
    typeof capabilities.Worker !== "undefined" &&
    typeof capabilities.OffscreenCanvas !== "undefined" &&
    // module-worker через import.meta.url нужен для бандла воркера
    typeof capabilities.URL !== "undefined"
  );
}

export function isWorkerSupported(): boolean {
  return canUsePdfWorker(globalThis);
}

/** Ошибка отмены — отличаем от настоящих сбоев, чтобы не уходить в fallback. */
export class WorkerAbortError extends Error {
  constructor() {
    super("aborted");
    this.name = "WorkerAbortError";
  }
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  onProgress?: (pct: number) => void;
}

let worker: Worker | null = null;
const pending = new Map<number, Pending>();
let seq = 0;

function rejectPending(reason: unknown) {
  pending.forEach((p) => p.reject(reason));
  pending.clear();
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./pdf-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.type === "progress") {
        p.onProgress?.(msg.pct);
        return;
      }
      pending.delete(msg.id);
      if (msg.type === "done") p.resolve(msg.result);
      else p.reject(new Error(msg.message));
    };
    worker.onerror = (e) => {
      // Фатальный сбой воркера — реджектим все ожидающие и пересоздаём.
      const err = new Error(e.message || "PDF worker crashed");
      rejectPending(err);
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function runInWorker(
  op: WorkerOp,
  file: File,
  args: unknown[],
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new WorkerAbortError());
      return;
    }
    const id = ++seq;

    const onAbort = () => {
      if (!pending.has(id)) return;
      // Убиваем воркер целиком — единственный надёжный способ прервать
      // синхронные циклы pdfjs/pdf-lib. Следующая операция поднимет новый.
      terminateWorker();
      rejectPending(new WorkerAbortError());
    };
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    pending.set(id, {
      resolve: (value) => {
        cleanup();
        resolve(value);
      },
      reject: (reason) => {
        cleanup();
        reject(reason);
      },
      onProgress,
    });
    signal?.addEventListener("abort", onAbort, { once: true });

    const req: WorkerRequest = { id, op, file, args };
    try {
      getWorker().postMessage(req);
    } catch (err) {
      pending.delete(id);
      cleanup();
      reject(err);
    }
  });
}

export interface RunPdfTaskOptions {
  file: File;
  args?: unknown[];
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

/**
 * Запускает операцию в воркере; при недоступности/сбое — fallback в main thread.
 *
 * @param op       имя операции (см. WorkerOp)
 * @param fallback функция, выполняющая ту же работу в main thread
 * @param opts     file, доп. аргументы, onProgress, signal для отмены
 */
export async function runPdfTask<T>(
  op: WorkerOp,
  fallback: () => Promise<T>,
  opts: RunPdfTaskOptions
): Promise<T> {
  const { file, args = [], onProgress, signal } = opts;

  if (!isWorkerSupported()) {
    return fallback();
  }

  try {
    return (await runInWorker(op, file, args, onProgress, signal)) as T;
  } catch (err) {
    // Отмену пробрасываем как есть — fallback тут не нужен.
    if (err instanceof WorkerAbortError) throw err;
    if (signal?.aborted) throw new WorkerAbortError();
    // Воркер не справился (нет nested worker, ошибка рендера и т.п.) →
    // повторяем в main thread, чтобы пользователь всё равно получил результат.
    if (import.meta.env.DEV) {
      console.warn(`[pdf-worker] "${op}" failed in worker, falling back to main thread:`, err);
    }
    return fallback();
  }
}
