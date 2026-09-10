// ============================================================
// Nested Worker Probe — проверка, что из нашего module worker можно
// спавнить ВЛОЖЕННЫЕ воркеры (нужно tesseract.js для OCR).
// ============================================================
//
// Спецификация воркеров обещает nested workers, но реальная поддержка в
// браузерах исторически рваная. Вместо сниффинга UA — одноразовый живой
// probe: Blob-скрипт поднимает воркер, тот создаёт вложенный воркер из
// Blob и ждёт от него 'pong'. Результат кэшируется в promise на время
// жизни страницы. Любая ошибка/таймаут трактуется как «не поддерживается».
//
// Использование: ocrPdf запускается в воркере только при target === 'worker'
// (см. ocr-pdf case в tool-page).

/** Куда выполнять OCR: воркер (если nested workers работают) или main thread. */
export function ocrExecutionTarget(nestedWorkersSupported: boolean): 'worker' | 'main' {
  return nestedWorkersSupported ? 'worker' : 'main';
}

let cachedProbe: Promise<boolean> | null = null;

// Blob-воркер: создаёт вложенного воркера и ретранслирует его 'pong' наверх.
const PROBE_SCRIPT = `
var nestedSource = "onmessage = function () { postMessage('pong'); }";
try {
  var nestedUrl = URL.createObjectURL(new Blob([nestedSource], { type: 'text/javascript' }));
  var nested = new Worker(nestedUrl);
  nested.onmessage = function () {
    postMessage('pong');
    nested.terminate();
    URL.revokeObjectURL(nestedUrl);
  };
  nested.onerror = function () {
    postMessage('fail');
  };
  nested.postMessage('ping');
} catch (e) {
  postMessage('fail');
}
`;

/**
 * Одноразовый probe вложенных воркеров (кэшируется). Безопасно false, когда
 * Worker недоступен вовсе (SSR, node-тесты). timeoutMs — максимум ожидания
 * 'pong' от вложенной цепочки.
 */
export function probeNestedWorkers(timeoutMs = 1500): Promise<boolean> {
  if (typeof Worker === 'undefined') return Promise.resolve(false);
  cachedProbe ??= runProbe(timeoutMs);
  return cachedProbe;
}

function runProbe(timeoutMs: number): Promise<boolean> {
  const state: {
    url: string;
    worker: Worker | null;
    timer?: ReturnType<typeof setTimeout>;
  } = { url: '', worker: null };

  return new Promise((resolve) => {
    let settled = false;

    const revokeUrl = () => {
      if (!state.url) return;
      try {
        URL.revokeObjectURL(state.url);
      } catch {
        // ignore
      }
    };

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (state.timer !== undefined) clearTimeout(state.timer);
      try {
        state.worker?.terminate();
      } catch {
        // ignore
      }
      revokeUrl();
      resolve(ok);
    };

    try {
      state.url = URL.createObjectURL(new Blob([PROBE_SCRIPT], { type: 'text/javascript' }));
      state.worker = new Worker(state.url);
    } catch {
      revokeUrl();
      resolve(false);
      return;
    }

    state.timer = setTimeout(() => finish(false), timeoutMs);
    state.worker.onmessage = (e: MessageEvent) => finish(e.data === 'pong');
    state.worker.onerror = () => finish(false);
  });
}
