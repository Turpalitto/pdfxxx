// ============================================================
// Polyfill: Map/WeakMap.prototype.getOrInsert / getOrInsertComputed
// ============================================================
//
// pdfjs-dist 5.5.x (modern build) внутренне вызывает
// `Map.prototype.getOrInsertComputed` — это метод TC39-предложения
// "Map.prototype.getOrInsert" (upsert), которого ещё нет в стабильных
// браузерах (и даже в Node 24). Без него pdfjs падает с
// `this.#methodPromises.getOrInsertComputed is not a function`.
//
// Файл импортируется ПЕРВЫМ в каждом контексте, где исполняется pdfjs
// (main thread — main.tsx, и наш pdf-worker.ts), как side-effect import.
// Если рантайм уже поддерживает метод — полифилл не трогает прототип.
//
// Семантика по спецификации предложения:
//   getOrInsert(key, value)        — вернуть значение по ключу; если ключа
//                                    нет, записать value и вернуть его.
//   getOrInsertComputed(key, cb)   — то же, но значение вычисляется cb(key)
//                                    только при отсутствии ключа.

type AnyMap = Map<unknown, unknown> | WeakMap<object, unknown>;

function install(proto: AnyMap) {
  const p = proto as unknown as Record<string, unknown>;

  if (typeof p.getOrInsert !== "function") {
    Object.defineProperty(p, "getOrInsert", {
      value: function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
        if (this.has(key as never)) return this.get(key as never);
        this.set(key as never, value as never);
        return value;
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  if (typeof p.getOrInsertComputed !== "function") {
    Object.defineProperty(p, "getOrInsertComputed", {
      value: function (
        this: Map<unknown, unknown>,
        key: unknown,
        callbackFn: (key: unknown) => unknown,
      ) {
        if (this.has(key as never)) return this.get(key as never);
        const value = callbackFn(key);
        this.set(key as never, value as never);
        return value;
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }
}

install(Map.prototype as unknown as AnyMap);
install(WeakMap.prototype as unknown as AnyMap);

export {};
