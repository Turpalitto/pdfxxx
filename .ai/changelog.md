# PDFX — Changelog

> История изменений проекта. Обновляется после каждого значимого изменения.

---

## [2026-06-05] — Bugfix: полифилл `Map.prototype.getOrInsertComputed` для pdfjs

### Проблема
- В реальном браузере пользователя инструменты падали с `this.#methodPromises.getOrInsertComputed is not a function` (проявилось на `pdf-to-pptx`).
- Причина: pdfjs-dist 5.5.207 (modern build) внутренне вызывает `Map.prototype.getOrInsertComputed` — метод TC39-предложения "Map.prototype.getOrInsert" (upsert), которого ещё **нет** в стабильных браузерах (и даже в Node 24 — проверено: `undefined`). `#methodPromises` живёт в `WorkerTransport` (API-сторона pdfjs, `api.js`), кэширует вызовы вроде `getMetadata`/`getOptionalContentConfig`.
- Почему не поймали раньше: Playwright-Chromium новее браузера пользователя и **имеет** этот метод → e2e зелёные, реальный браузер падает.

### Исправлено
- Новый side-effect полифилл `client/src/lib/map-polyfill.ts` — добавляет `getOrInsert`/`getOrInsertComputed` для `Map`/`WeakMap`, если их нет (по семантике предложения, non-enumerable). На рантаймах с нативной поддержкой — no-op.
- Импортируется **первым** в обоих контекстах, где исполняется pdfjs-транспорт: `main.tsx` (main thread) и `workers/pdf-worker.ts` (наш воркер — там идёт транспорт для pptx/compare/redact/…). Сабворкер pdfjs (`pdf.worker.mjs`) не использует `#methodPromises` → патч ему не нужен.

### Проверки
- `npx tsc --noEmit` → 0; семантика полифилла проверена в Node (compute-once на miss, не перезаписывает на hit, non-enumerable); `npm run build` → успех; worker-tools e2e → 16/16 (без регрессий).
- Примечание: e2e подтверждает «нет регрессий», но **не** «фикс работает» — Playwright-Chromium имеет нативный метод. Финальное подтверждение — ретест в реальном браузере пользователя.

---

## [2026-06-05] — Web Workers Round 21: pdfToPptx в воркер; ocrPdf остаётся на main thread

### Перенесено
- `pdfToPptx` (pdf-to-pptx) — через `runPdfTask` + fallback + Cancel. Canvas переведён на абстракцию (`createRenderCanvas`/`canvasToDataUrl`/`releaseCanvas`). **Эмпирически подтверждено e2e: worker-путь работает, fallback не срабатывает** — pptxgenjs не зависит от DOM в части addImage(dataURL)+write.

### Проверено и НЕ перенесено (осознанно)
- `ocrPdf` (ocr-pdf) — остаётся на main thread. Probe-тест показал: tesseract.js создаёт вложенные воркеры, которые не стартуют внутри нашего module-воркера → worker-путь **всегда уходил в fallback**. Оставить в воркере = доомный спавн + fallback на каждом OCR (хуже по UX). Функция и canvas откатаны к исходному виду; op/case `ocrPdf` в протоколе остаются как задел (не используются).

### Изменено
- `pdf-utils.ts`: `pdfToPptx` — canvas-абстракция.
- `tool-page.tsx`: `pdf-to-pptx` через `runPdfTask`; для `ocr-pdf` оставлен прямой вызов + комментарий, почему.
- `worker-tools.spec.ts`: +тест pdf-to-pptx (worker-путь, без fallback).

### Итог по миграции в Web Worker
- Все canvas-зависимые PDF-инструменты вынесены в воркер (Rounds 17–21). Единственное исключение — OCR (вложенные воркеры tesseract нежизнеспособны в module-воркере).

### Проверки
- `npx tsc --noEmit` → 0 ошибок; `npm test` → 39/39; `npm run build` → успех; worker-tools e2e → 16/16; полный e2e baseline (оба проекта) → 41 passed / 3 skipped.

---

## [2026-06-05] — Web Workers Round 20: redactPdf в воркер

### Перенесено (через `runPdfTask` + fallback)
- `redactPdf` (redact-pdf) — последний canvas-зависимый кандидат. Main-thread fallback + Cancel. `searchText` передаётся в `args[0]`.

### Изменено
- `pdf-worker-types.ts` / `pdf-worker.ts`: +1 op `redactPdf`.
- `pdf-utils.ts`: `redactPdf` — `document.createElement("canvas")`/`toDataURL` заменены на canvas-абстракцию (`createRenderCanvas`/`canvasToJpegBytes`/`releaseCanvas`). Буферы уже копировались до `getDocument` — detach-бага не было.
- `tool-page.tsx`: `redact-pdf` через `runPdfTask` + signal (раньше — прямой вызов). Уже был в `realProgressSlugs`.

### E2E
- `worker-tools.spec.ts`: +тест redact-pdf (ввод `input-redact-text`, текст есть на каждой странице фикстуры → проходит canvas-путь растеризации). Без fallback-warning. **15/15 зелёные.**

### Осталось в main thread (нужны вложенные воркеры)
- `pdfToPptx` (pptxgenjs/DOM) и `ocrPdf` (tesseract) — отдельный этап.

### Проверки
- `npx tsc --noEmit` → 0 ошибок; `npm test` → 39/39; `npm run build` → успех; e2e → 15/15.

---

## [2026-06-05] — Web Workers Round 19: comparePdf / autoRedactPdf / pdfDiff в воркер

### Перенесено (через `runPdfTask` + fallback)
- `comparePdf` (compare-pdf), `autoRedactPdf` (auto-redact), `pdfDiff` (pdf-diff). Все три — с main-thread fallback и поддержкой Cancel.

### Изменено
- `pdf-worker-types.ts` / `pdf-worker.ts`: добавлены 3 op. Для двухфайловых операций (compare/diff) второй файл передаётся в `args[0]` (structured-clone File), без изменения протокола.
- `pdf-utils.ts`:
  - `comparePdf` — добавлен `onProgress`; `document.createElement("canvas")`/`toDataURL`+`atob` заменены на canvas-абстракцию (`createRenderCanvas`/`canvasToJpegBytes`/`releaseCanvas`) — работает в воркере.
  - `autoRedactPdf` — canvas переведён на абстракцию; **исправлен предсуществующий баг**: буфер копировался (`bytes.slice(0)`) уже ПОСЛЕ `getDocument`, который детачит его (pdfjs transfer) → pdf-lib получал пустой буфер. Теперь копия снимается ДО `getDocument` (паттерн из `ocrPdf`).
  - `pdfDiff` — без изменений тела (нет canvas, file1 перечитывается заново — worker-safe).
- `tool-page.tsx`: 3 слага через `runPdfTask` + signal; добавлены в `realProgressSlugs`; на двух input'ах второго файла — `data-testid` (`input-compare-file2`, `input-diff-file2`) для e2e.

### E2E
- `worker-tools.spec.ts` расширен: two-file (compare-pdf, pdf-diff — загрузка второго файла) + auto-redact (фикстура с email, чтобы пройти canvas-путь редактирования). Без fallback-warning. **14/14 зелёные.**

### Осталось в main thread (нужны вложенные воркеры)
- `pdfToPptx` (pptxgenjs/DOM) и `ocrPdf` (tesseract) — отдельный этап.

### Проверки
- `npx tsc --noEmit` → 0 ошибок; `npm test` → 39/39; `npm run build` → успех; e2e → 14/14.

---

## [2026-06-05] — E2E-верификация worker-пути (браузер) + фикс blank-page багов

### Добавлено
- `tests/e2e/worker-tools.spec.ts` — браузерный e2e (Playwright, chromium-desktop) для 8 worker-инструментов: каждый даёт download без warning «falling back to main thread»; проверка, что реально спавнится выделенный `pdf-worker`; проверка, что Cancel прерывает задачу и возвращает в idle.

### Результат верификации
- Worker-путь подтверждён в браузере: воркер спавнится, fallback не срабатывает, Cancel работает. **11/11 e2e зелёные.**

### Исправлено (предсуществующие баги контента, не связаны с миграцией; вскрыты фикстурой с пустой страницей)
- `pdf-utils.ts`: `embedPages()` бросал `Can't embed page with missing Contents` на странице без content-stream. Добавлен helper `pageHasContents()`; `toSinglePage` и `bookletImposition` теперь пропускают (не рисуют) пустые/padding-страницы вместо падения. Геометрия страниц сохранена.
  - Особенно важно для `bookletImposition`: padding до кратности 4 через `addPage()` создавал пустые страницы → падал на любом PDF с числом страниц не кратным 4.
- `pdf-utils.ts`: `removeBlankPages` падал с «No PDF header found» — `pdfjs.getDocument({data: bytes})` детачит буфер, а затем `PDFDocument.load(bytes)` получал пустой буфер. Теперь bytes перечитываются из файла для pdf-lib.

### Проверки
- `npx tsc --noEmit` → 0 ошибок; `npm test` → 39/39; `npm run build` → успех; e2e → 11/11.

---

## [2026-06-04] — Web Workers: перенос ещё 5 функций

### Добавлено (перенесены в воркер через `runPdfTask` + fallback)
- `scannerEffect` (scanner-effect), `removeBlankPages` (remove-blank-pages), `nUpPdf` (n-up-pdf), `toSinglePage` (to-single-page), `bookletImposition` (booklet-imposition).
- Для всех сохранён fallback в main thread, реальный прогресс и корректная отмена (Cancel → terminate воркера).

### Изменено
- `pdf-utils.ts`: `scannerEffect`, `removeBlankPages`, `nUpPdf` переведены с `document.createElement("canvas")`/`toDataURL` на canvas-абстракцию (`createRenderCanvas`/`canvasToJpegBytes`/`releaseCanvas`) — поведение main thread 1:1. `toSinglePage` и `bookletImposition` правок не требовали (чистый pdf-lib).
- `tool-page.tsx`: 5 кейсов переведены на `runPdfTask`; список `realProgressSlugs` исключает их из симуляции прогресса.
- `pdf-worker-types.ts` / `pdf-worker.ts`: добавлены 5 операций в `WorkerOp` и switch.

### Осталось в main thread (намеренно)
- `pdfToPptx` (pptxgenjs/DOM) и `ocrPdf` (tesseract вложенные воркеры) — отдельный этап.

### Проверки
- `npm run check` → 0 ошибок; `npm test` → 39/39; `npm run build` → успех (воркер-чанк `pdf-worker-*.js`, SW precache обновлён).

---

## [2026-06-04] — Web Workers для тяжёлых PDF-операций + кнопка «Отменить»

### Добавлено
- **Архитектура Web Workers** (`client/src/workers/`):
  - `pdf-worker-types.ts` — протокол сообщений (WorkerRequest/Response, ProgressMessage, ops).
  - `pdf-worker.ts` — воркер, импортирует функции из `pdf-utils` как есть, шлёт прогресс/результат/ошибку. Uint8Array возвращается через transferable buffer.
  - `worker-client.ts` — main-thread обёртка `runPdfTask(op, fallback, opts)`: прокидывает прогресс, поддерживает отмену (`AbortSignal` → `worker.terminate()`), и **автоматический fallback** в main thread при недоступности/сбое воркера (корректность гарантирована).
- **Canvas-абстракция** (`pdf-utils.ts`): `createRenderCanvas` / `canvasToJpegBytes` / `canvasToDataUrl` / `releaseCanvas` — в воркере используют `OffscreenCanvas`, в main thread поведение 1:1 (HTMLCanvasElement + toDataURL). Это позволяет одному и тому же коду работать в обоих контекстах.
- **Перенесены в воркер**: `grayscalePdf`, `invertColors`, `pdfToImages` (инструменты grayscale-pdf, invert-colors, pdf-to-jpg, pdf-to-png, extract-images). UI больше не подвисает на этих операциях.
- **Кнопка «Отменить» / «Cancel»** (`tool-page.tsx`): показывается только при `state === "processing"`. Воркер-операции прерываются мгновенно (terminate); main-thread операции не прерываются кооперативно, но результат отбрасывается по `signal.aborted`.

### Изменено
- `vite.config.ts`: добавлен `worker: { format: "es" }` — воркер тянет dynamic `import()` из pdf-utils (code-splitting), что несовместимо с дефолтным `iife`.

### Не перенесено (намеренно, инфра готова)
- `pdfToPptx` (pptxgenjs зависит от DOM) и `ocrPdf` (tesseract.js создаёт вложенные воркеры) пока выполняются в main thread — требуют проверки совместимости.

### Проверки
- `npm run check` (tsc) → 0 ошибок.
- `npm test` (vitest) → 39/39 пройдено.
- `npm run build` → успешно, воркер-чанк `pdf-worker-*.js` эмитится, SW precache обновлён.

---

## [2026-06-03] — Аудит-фиксы редактора: H8, H9

### Исправлено
- **H8 — потеря текста при смене страницы** (`edit-pdf-page.tsx`): `commitTextEditor` больше не выбрасывает набранный текст, когда `editor.pageNumber !== currentPage`. Добавлен helper `commitEditorToStoredPage`, который строит Textbox на offscreen StaticCanvas и мержит его в сохранённый JSON исходной страницы (`pageStatesRef`).
- **H9 — гонка undo/redo** (`use-editor-history.ts`): добавлен re-entrancy guard `restoringRef`. Пока `loadFromJSON` одного undo/redo в полёте, повторные вызовы игнорируются — это исключает преждевременное снятие `suppressHistoryRef` резолвом первого промиса и порчу истории при двойном Ctrl+Z. `resetHistory` сбрасывает guard и suppress-флаг при пересоздании canvas.
- `npx tsc --noEmit` → 0 ошибок.

---

## [2026-06-02] — Round 16: Мобильная адаптация edit-pdf + Skeleton

### Добавлено
- **Мобильная адаптация PDF-редактора** (`edit-pdf-page.tsx`):
  - Тулбар горизонтально-прокручиваемый на мобильных (`flex-nowrap overflow-x-auto`), на десктопе `flex-wrap`. Скроллбар скрыт.
  - Боковая панель миниатюр скрыта на мобильных; добавлен выдвижной drawer (кнопка `Layers` → overlay со списком страниц; закрытие по тапу на подложку/X/выбор страницы).
  - Отступы canvas уменьшены на мобильных (`p-3 md:p-6`).
  - Длинная подсказка горячих клавиш скрыта на мобильных (`hidden md:inline`).
  - Новое состояние `mobileThumbsOpen`, импорт иконки `Layers`.
- **Skeleton loading** (`App.tsx`): глобальный Suspense fallback заменён на адаптивный skeleton (заголовок + панель загрузки с плейсхолдерами) вместо мелкого спиннера — убирает белый экран при медленном соединении.

### Аудит (уже было реализовано ранее)
- ✅ Keyboard shortcuts в редакторе (Ctrl+Z/Y/F/A, Del, Ctrl+S, V/T/B/H/R/C/L) + подсказка
- ✅ SEO: динамические `<title>`/`<meta description>` per-tool
- ✅ 404-страница (панель, иконка, кнопки, SEO)

### Тесты
- Добавлен e2e-тест `tests/e2e/editor-mobile.spec.ts` (mobile-chrome/Pixel 5, scoped через `test.skip`): загрузка PDF, отсутствие горизонтального переполнения, скрытие десктоп-сайдбара, открытие/закрытие drawer миниатюр. Подтверждено скриншотами.
- Обновлён устаревший `smoke.spec.ts` («theme toggle» → «shared palette»): переключатель темы был удалён в прошлой сессии (`theme.tsx` захардкожен `light`, кнопка убрана из навбара), тест ждал несуществующую кнопку и таймаутил. Теперь проверяет, что приложение light-only + палитра/overflow.

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 39/39
- ✅ Playwright: 11 passed, 0 failed (3 skipped: editor-mobile@desktop + 2 OCR)

---

## [2026-06-02] — Round 15: Drag-and-drop + Backlog Audit

### Добавлено
- **Drag-and-drop reorder** в FileUpload: файлы можно перетаскивать для изменения порядка (merge-pdf и др. многопоточные инструменты). HTML5 Drag & Drop API, визуальная подсветка drop-зоны.
- `onReorderFiles` prop в `<FileUpload>`

### Аудит backlog
Выявлены уже реализованные задачи:
- ✅ Предпросмотр результата (previewDataUrl для PDF)
- ✅ Прогресс-бар для split-by-size (onProgress)
- ✅ PWA (vite-plugin-pwa настроен)
- ✅ Ленивая загрузка tool-page.tsx (dynamic import)
- ✅ История последних файлов (useRecentFiles + localStorage)
- ✅ pdf-diff, pdf-to-markdown, add-background, remove-images, pdf-to-audio

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 39/39

### Изменено
- **Виртуализация**: Добавлен `useLazyRender` hook — список инструментов на главной грузится порциями по 12, а не все 57 сразу. Задержка анимации ограничена 12 элементами.
- **BUG-01**: autoRedactPdf переписан на canvas-based подход (как redactPdf) — корректное позиционирование масок на ротированных страницах.
- Unit-тесты pdf-utils: 22→39 (+17 новых тестов для чистых функций).

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 39/39

### Исправлено
- **BUG-01**: autoRedactPdf на ротированных страницах — маски позиционировались неправильно из-за прямых координат pdf-lib. Переписан на canvas-based подход (как redactPdf): рендер через pdfjs viewport + `convertToViewportPoint`, затем embed JPEG.Теперь корректно работает при любом /Rotate.

### Добавлено
- Unit-тесты для pdf-utils: 22→39 тестов (+17). Добавлены тесты для `formatBytes`, `parsePageSelection`, `normalizeEditorFontFamily`, `hexToRgba`, `clamp`, `dataUrlToBytes`, `mbToBytes`, `looksLikePdfFile`, `getAvailableVoices`, `pdfToAudio`.

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 39/39

### Изменено
- **TD-02 Phase 4**: Извлечён `use-editor-save.ts` из `edit-pdf-page.tsx` (2325→2278 строк, −47):
  - handleSave — полный цикл экспорта PDF (fabric→canvas→png→pdf-lib→download)
  - Удалён неиспользуемый импорт `PDFDocument` из `pdf-lib`
  - Удалён неиспользуемый импорт `dataUrlToBytes` из `edit-pdf-utils`

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 22/22

### Изменено
- **TD-02 Phase 3**: Извлечены хуки из `edit-pdf-page.tsx` (2575→2325 строк, −250):
  - `use-editor-history.ts` — pushHistory, handleUndo, handleRedo, canUndo, canRedo, suppressHistoryRef, resetHistory
  - `use-editor-signature.ts` — signModalOpen, signCanvasRef, openSignModal, clearSignaturePad, confirmSign, disposeSignatureCanvas

### Удалено (аудит)
- 9 неиспользуемых npm-зависимостей: @dnd-kit/core, @dnd-kit/sortable, @hookform/resolvers, @jridgewell/trace-mapping, comlink, next-themes, react-icons, tw-animate-css, zod, zod-validation-error

### Добавлено
- `og:image` и `twitter:image` метатеги в `useSeo()` и `index.html`
- Skip-link для клавиатуры (a11y) в `App.tsx`

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 22/22

---

## [2026-06-02] — Round 10: TD-02 Phase 2 — Find&Replace Hook

### Изменено
- **TD-02 Phase 2**: Извлечён Find&Replace из `edit-pdf-page.tsx` (2776→2575 строк, −201) в:
  - `client/src/hooks/use-find-replace.ts` — хук с 7 колбэками (clearFindHighlights, getLineMeasure, measureMatchRect, findInPage, navigateFindMatch, replaceCurrentMatch, replaceAllMatches) + 6 state/ref
  - `client/src/lib/edit-pdf-types.ts` — добавлен интерфейс `FindMatch`

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 22/22

---

## [2026-06-02] — Round 9: Refactoring + Full Code Audit

### Изменено
- **TD-02 Phase 1**: Извлечены типы и утилиты из `edit-pdf-page.tsx` (3436→2776 строк, -660) в:
  - `client/src/lib/edit-pdf-types.ts` — типы (ToolType, DrawColor, TextLineMetric, ActiveTextEditor и др.) и константы (DISPLAY_SCALE, EDITOR_COLORS, EDITOR_FONT_FAMILIES)
  - `client/src/lib/edit-pdf-utils.ts` — чистые функции (extractTextLines, findNearestTextLine, measureEditorTextWidth, buildHighlightRectMetrics, normalizePdfFontFamily и 25 других)

### Исправлено (аудит)
- **privacy.tsx / terms.tsx**: Заменены жёстко заданные dark-тема цвета (`text-white`, `text-slate-400`, `bg-slate-950/60`, `border-white/10`) на CSS-переменные (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`). Страницы теперь корректно отображаются в светлой и сепии темах.
- **tool-page.tsx**: Удалены неиспользуемые импорты (Scissors, RotateCw, Hash, AlignLeft, Droplets, Tabs*, getAvailableVoices)
- **edit-pdf-page.tsx**: Удалены 8 неиспользуемых импортов (TextSegmentMetric, TextInsertionStyle, buildEditorFontString, normalizePdfFontFamily, getFontTraits, findNearestTextSegment, estimateLineCaretIndex, resolveHighlightRange)
- **tools.ts**: Удалены неиспользуемые иконки (Printer, WrenchIcon, LayersIcon)
- **pdf-utils.ts**: Удалён мёртвый код — `mergePdfByteArrays` (10 строк) и `redactPdfLegacy` (~120 строк)
- **tool-page.tsx**: Удалён фейковый `aggregateRating` из schema.org structured data (риск штрафа Google)
- **not-found.tsx**: Добавлен `useSeo()` с корректным title и description
- Добавлен `robots.txt` со ссылкой на sitemap
- Добавлен `sitemap.xml` со всеми 57 инструментами и статическими страницами

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 22/22
- ✅ Production build: успешен

---

## [2026-06-02] — Round 8: TD-11 Find&Replace fix + E2E rotation tests

### Исправлено
- **TD-11**: Find&Replace белая маска теперь использует `canvas.measureText()` для точного позиционирования вместо approximation по character-ratio. Новые хелперы `getLineMeasure()` и `measureMatchRect()` в `edit-pdf-page.tsx` — точная ширина сегмента текста для маски и замены.
- Зависимости `findInPage`, `replaceCurrentMatch`, `replaceAllMatches` обновлены (`getLineMeasure` добавлен в deps).

### Добавлено
- **E2E-тесты rotation-фиксов** (`tests/e2e/rotation.spec.ts`):
  - `crop-pdf handles rotated PDF with auto-crop` — создаёт PDF с `/Rotate 90`, загружает, включает auto-crop, проверяет успешную обработку
  - `redact-pdf handles rotated PDF with search text` — аналогично с поиском "CONFIDENTIAL"
  - `ocr-pdf handles rotated PDF` — skip (tesseract.js слишком медленный для CI)
  - Тестовые PDF-фикстуры генерируются динамически через `pdf-lib`

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 22/22
- ✅ Playwright: 2/2 rotation-теста пройдены (chromium-desktop)

---

## [2026-06-01] — Round 7: PWA offline + полный аудит багов

### Добавлено
- **PWA (offline-режим)** — настроен `vite-plugin-pwa` в `vite.config.ts`:
  - `registerType: autoUpdate`, `injectRegister: auto` (SW регистрируется автоматически)
  - Precache всех ассетов (43 файла, ~5 MB), `navigateFallback` для SPA
  - `runtimeCaching` (CacheFirst) для CDN tesseract.js → офлайн-OCR
  - `maximumFileSizeToCacheInBytes: 8MB` под крупные pdf/ui чанки
- `theme-color` meta + `apple-touch-icon` в `index.html`
- Сборка генерирует `sw.js`, `workbox-*.js`, `manifest.webmanifest`

### Исправлено
- **Сломанная иконка манифеста**: `public/manifest.json` ссылался на несуществующий `/favicon.ico` → исправлено на `/favicon.png` (128×128, any+maskable)
- **CRASH (Rules of Hooks)**: в `tool-page.tsx` два `useEffect` (recent-tool, form-fill) стояли ПОСЛЕ ранних `return` → React падал при переходе между launch-ready и не-launch-ready инструментом. Хуки перенесены выше всех `return`.
- **Дублирующийся UI**: блок done-summary рендерился дважды в `tool-page.tsx` (state === "done") → удалён дубль
- **bookletImposition**: ширина листа была `pageH*2` вместо `pageW*2` → две portrait-страницы кривo ложились с огромным пустым полем. Исправлено.
- **resizePages**: добавлен guard от NaN/Infinity при вырожденном media box (origW/origH = 0)
- **recent-files useEffect**: добавлены `slug` и `files[0].size` в зависимости (пропускался учёт смены инструмента/файла того же имени)

### Аудит (отчёт)
- TypeScript: 0 ошибок. Vitest: 22/22. Структура: 57 инструментов, 0 дублей slug, 0 дублей экспортов, switch-case покрывает все slug, EN+RU 57/57 без пропусков.
- **BUG-08 (rotation)** исправлен во всех трёх функциях:
  - `redactPdf` — маска строится по 4 углам текстового run в PDF-space с проекцией через `convertToViewportPoint` (над-покрытие, безопасно; для rotation=0 эквивалентно прежнему). Закрывает security-риск остаточного текста на повёрнутых страницах.
  - `cropPdf` (autoCrop) — CropBox через `vp.convertToPdfPoint()` вместо ручных scaleX/scaleY (корректно для /Rotate и ненулевого origin).
  - `ocrPdf` + `ocrPdfLegacy` — позиция невидимого слоя через `convertToPdfPoint` (для rotation=0 идентично, на повёрнутых — корректно).
- **BUG-09** — `ocrPdfLegacy`: `worker.terminate()` обёрнут в try/finally (нет утечки при ошибке в цикле).
- **TD-09** — удалён осиротевший `public/manifest.json` (активен `manifest.webmanifest` от плагина).
- **TD-10** — удалён мёртвый код в `edit-pdf-page.tsx`: недостижимый блок (1504-1564, после `return` в обработчике "text") и неиспользуемый `handleCanvasClick` (битый Fabric v7 API: `Circle`). Хелперы `resolveTextInsertionStyle`/`normalizeEditorFontFamily` сохранены — используются в других местах.
- **TD-12** — удалена мёртвая функция `ocrPdfLegacy` (нигде не вызывалась).
- Осталось (требует подтверждения): маска Find&Replace по char-ratio (TD-11).

### TypeScript: 0 ошибок

## [2026-06-01] — Round 6: 7 новых инструментов из анализа Stirling-PDF

### Добавлено
- **invert-colors** (utility/slate) — инверсия цветов PDF через canvas pixel flip
- **	o-single-page** (organize/teal) — объединение всех страниц в одну через pdf-lib embedPages
- **emove-images** (utility/rose) — удаление XObject Image ресурсов через pdf-lib PDFName
- **orm-fill** (utility/blue) — интерактивное заполнение AcroForm полей (text/checkbox/radio/dropdown)
- **split-by-chapters** (organize/amber) — разбивка по закладкам: pdfjs getOutline() + pdf-lib copyPages -> ZIP
- **ooklet-imposition** (organize/indigo) — перекладка страниц для печати брошюры (N, 1, 2, N-1...)
- **scanner-effect** (utility/orange) — эффект сканера: желтизна + шум через canvas pixel manipulation

### Исправлено
- Восстановлено потерянное объявление const ocrLanguageOptions = [ в tool-page.tsx
- Удалено невалидное поле cceptMultiple из tools.ts

### TypeScript: 0 ошибок

## [2026-05-30] — 16 Tools Integration: Functions, UI, Translations

### Добавлено
- **11 новых функций в `pdf-utils.ts`:**
  - `cropPdf()` — обрезка полей в мм
  - `getPdfMetadata()` / `setPdfMetadata()` — просмотр и редактирование метаданных
  - `comparePdf()` — сравнение двух PDF side-by-side
  - `removeBlankPages()` — авто-удаление пустых страниц (текст + пиксельный анализ)
  - `resizePages()` — масштабирование до A4/A3/Letter/Legal/A5
  - `grayscalePdf()` — конвертация в оттенки серого
  - `pdfBookmarks()` — экспорт закладок/TOC в текст
  - `autoRedactPdf()` — авто-маскировка email/phone/SSN/IBAN/regex
  - `nUpPdf()` — 2-up/4-up компоновка страниц
  - `splitBySize()` — разбивка по размеру файла → ZIP
  - `overlayPdf()` — наложение PDF с прозрачностью
- **16 инструментов подключены в `tool-page.tsx`:**
  - State-переменные, switch cases, download handlers, JSX UI
- **EN + RU переводы** для 7 ранее отсутствовавших инструментов
- Исправлены TypeScript-ошибки в `removeImages()` (PDFDict type) и `splitByChapters()` (dest type)

### Изменено
- `removeBlankPages()` — добавлена проверка текста перед пиксельным анализом (как в Stirling-PDF)
- Все `page.render()` вызовы обновлены с параметром `canvas` для совместимости с pdfjs-dist types

### Верификация
- ✅ TypeScript: 0 ошибок (`npx tsc --noEmit`)
- ✅ Браузерное тестирование 16 страниц — UI рендерится корректно

---

## [2026-05-30] — Algorithm Improvements & Tests & UI Yielding

### Исправлены баги (аудит всех 57 функций)
- **addBlankPages** — пустые страницы создавались без размера → теперь берут размер первой страницы
- **resizePages** — `translateContent` работал в отмасштабированных координатах → исправлен на `offsetX / scale`
- **cropPdf** — добавлен `yieldToUI()` для тяжёлого autoCrop цикла
- **removeBlankPages** — добавлен `yieldToUI()` в цикл детекции
- **autoRedactPdf** — добавлен `yieldToUI()` в цикл маскировки
- **overlayPdf** — добавлен `yieldToUI()` в цикл наложения
- **comparePdf** — добавлен `yieldToUI()` в цикл рендеринга
- **invertColors** — добавлен `yieldToUI()` в цикл инверсии
- Все 6 тяжёлых циклов теперь отдают управление UI каждые 3 страницы

### Улучшено
- **`autoRedactPdf()`** — BUG-01 исправлён: пропорциональное позиционирование внутри текстового элемента вместо прямых `transform[4]/[5]`
- **`cropPdf()`** — добавлен **auto-crop режим** (чекбокс в UI): рендерит страницу, находит границы контента, устанавливает CropBox
- **`resizePages()`** — переписана без canvas: `page.scale()` + `page.translateContent()` из pdf-lib — сохраняет векторность
- **`splitBySize()`** — оптимизация с O(n²) до O(n): оценка размера каждой страницы за 1 проход, группировка, затем `copyPages()`

### Добавлено
- **4 новых инструмента**: `pdf-to-markdown`, `add-background`, `pdf-diff`, `pdf-to-audio`
- **TD-05**: Удалены мёртвые зависимости (drizzle-orm, drizzle-zod, passport, passport-local, express-session, connect-pg-simple, pg, memorystore, drizzle-kit) и файлы (drizzle.config.ts, shared/schema.ts, server/storage.ts)
- **TD-06**: compare-pdf и overlay-pdf — hidden file input с красивой кнопкой + имя файла + "Убрать"
- **BUG-03**: split-by-size — при 1 части возвращает исходный PDF (не ZIP); при нескольких — ZIP с проверкой по magic bytes
- Переводы EN+RU для 4 новых инструментов
- **`yieldToUI()`** — утилита для тяжёлых циклов (каждые 3 страницы `setTimeout(0)` чтобы UI не зависал)

### Техдолг
- TD-01: Частично решён через `yieldToUI()` — полные Web Workers невозможны из-за DOM-зависимости pdfjs
- TD-04: Unit tests — 22 теста покрывают все экспорты и regex-паттерны
- TD-02: Декомпозиция edit-pdf-page.tsx отложена — слишком рискованно для одной сессии

### Верификация
- ✅ TypeScript: 0 ошибок
- ✅ Vitest: 22/22 тестов пройдены
- ✅ Браузерное тестирование: все 4 улучшенных инструмента рендерятся корректно

---

## [2026-05-30] — Competitive Analysis, New Tools & Preview Feature

### Добавлено
- **4 новых PDF инструмента:**
  - `add-blank-pages`: Вставка пустых страниц в указанные позиции
  - `sanitize-pdf`: Удаление метаданных, JavaScript и трекинга для приватности
  - `pdf-to-pdfa`: Конвертация в архивный формат PDF/A для долгосрочного хранения
  - `extract-forms`: Извлечение данных полей форм в JSON формат
- **Preview результата:** Автоматический предпросмотр первой страницы PDF после обработки
  - Работает для всех PDF-инструментов (outputExt === "pdf")
  - Использует pdfjs-dist для рендеринга
  - Worker загружается из node_modules (подход Stirling-PDF)
  - Отображается под кнопкой "Скачать"
  - Масштаб 1.5x, максимальная высота 400px
- Функции в `pdf-utils.ts`: `addBlankPages()`, `sanitizePdf()`, `convertToPdfA()`, `extractFormFields()`
- Переводы EN + RU для новых инструментов в `tool-translations.ts`
- Интеграция в `tool-page.tsx`: обработчики в `handleProcess()` и `handleDownload()`
- Установлены пакеты: `comlink`, `@dnd-kit/core`, `@dnd-kit/sortable`, `vite-plugin-pwa`

### Изменено
- Общее количество инструментов: **47** (было 43, +4 новых)
- `tool-card.tsx`: исправлено переполнение текста в карточках
  - Добавлен `line-clamp-2` для заголовков
  - Добавлен `break-words` для описаний
  - Добавлен `truncate` для категорий
  - Добавлен `flex-shrink-0` для бейджей статуса
- `tool-page.tsx`: preview генерируется асинхронно после setState("done")

### Исправлено
- pdfjs worker path: используется `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` (подход Stirling-PDF)
- Preview теперь работает корректно для всех PDF-инструментов

### Технический долг (отложено)
- Drag-and-drop для merge-pdf (требует интеграцию @dnd-kit)
- Batch processing UI (требует рефакторинг tool-page.tsx)
- Web Workers для тяжёлых операций (требует Comlink setup)
- PWA offline mode (требует vite-plugin-pwa конфигурацию)
- Operation history sidebar (требует новый компонент)

### Верификация
- ✅ TypeScript: 0 ошибок (`npx tsc --noEmit`)
- ✅ Dev server: запущен на :5000
- ✅ Все новые инструменты интегрированы
- ✅ Preview реализован с правильным worker path
- ✅ Карточки инструментов не переполняются

---

## [2026-05-29] — Начальное состояние проекта

### Существует
- 43 PDF инструмента: PDF конвертация, организация
- React + TypeScript + Vite + Tailwind + shadcn/ui
- Express.js backend (только раздача статики)
- 18 языков интерфейса
- Fabric.js canvas редактор (`edit-pdf`)
- Tesseract.js OCR

---

## Формат для будущих записей

```markdown
## [YYYY-MM-DD] — Краткое описание изменений

### Добавлено
- item

### Изменено
- item

### Исправлено
- item

### Удалено (с обоснованием)
- item
```
