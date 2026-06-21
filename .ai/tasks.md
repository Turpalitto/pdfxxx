# PDFX — Tasks & Technical Debt

> Обновляется AI-агентами после каждой значимой задачи.  
> Last updated: 2026-06-21

---

## 🎯 Roadmap «переплюнуть iLovePDF»

> У PDFX уже 55+ инструментов (больше iLovePDF). Разрыв — в качестве 5 ключевых операций + экосистеме. Козырь PDFX: 100% в браузере, без загрузки на сервер.

- [x] **#1 Реальное сжатие картинок в Compress PDF (2026-06-12)** — см. ниже в «Решено»
- [~] **#2 Fidelity pdf-to-word/excel** — **Phase A+B+C+ готов (2026-06-18)**: A — типографика, B — таблицы `w:tbl`, C — цвет текста (`<w:color>`) + сканы (PNG в docx) + fontFamily (`<w:rFonts>`) + page size из PDF + spacing + smart scan detection (text density < 2%).
- [x] **#3 Workflow-цепочки (2026-06-12)** — см. ниже в «Решено»
- [x] **#4 Включить 10 языков + RTL** — es, fr, de, pt, zh, ja, ko, ar, hi, tr добавлены в LANGUAGES. Арабский RTL. Переводы.hero/nav уже были в translationMap, tool-translations полные. tsc 0 · vitest 56/56 · build OK.
- [x] **SEO для 12 языков (2026-06-18)** — sitemap.xml LANG_CODES 12 + все TOOL_SLUGS, home.tsx useSeo через t.hero, hreflang динамически.
- [x] **Новый инструмент bates-numbering (2026-06-18)** — юридическая нумерация (prefix+zero-pad+suffix), 5 позиций, переводы 12 языков.
- [ ] **#5 Импорт из Google Drive / Dropbox**
- [x] **#6 Усилить OCR** — адаптивный масштаб рендера (`ocrRenderScale`), мультиязычный UI (16 языков, чекбоксы). Скорость на больших страницах; точность на мелких.

## 🔄 Текущие задачи (In Progress)

- [ ] Round 4 Phase D: постепенно вынести worker invocation wrappers из `tool-page.tsx` на typed registry metadata без изменения UX и slug.
- [ ] TD-02 Phase 5: Дальнейшая декомпозиция edit-pdf-page.tsx (~2291 строк) — выигрыш мал (каждый хук 10+ параметров)

## ✅ Решено

- [x] **Round 4 Phase C registry-backed process progress (2026-06-21)** — `tool-page.tsx` больше не хранит локальный список `realProgressSlugs`; progress-поведение (`simulated`/`callback`) добавлено в `ToolExecutionDefinition` и читается через `shouldSimulateToolProgress()`. UX и slug сохранены, сам switch пока не переписан. Проверки: check OK, vitest 103/103, build OK, smoke e2e 12/12.

- [x] **Round 4 Phase B registry-backed download runner (2026-06-21)** — `handleDownload` в `tool-page.tsx` переведён на `createToolDownloadPlan()` из `client/src/tools/shared/download.ts`: filename/mime берутся из registry output metadata с безопасными динамическими исключениями для split PDF/ZIP. UX, slug и имена файлов сохранены. Проверки: check OK, vitest 100/100, build OK, smoke e2e 12/12.

- [x] **Round 6 Phase B command palette presets + recent tools (2026-06-21)** — command palette получила Workflow presets с deep link `/workflow?preset=...` и recent tools из sanitized recent storage; имена файлов, пути и содержимое документов не читаются/не показываются. Presets вынесены в lightweight `workflow-presets.ts`, чтобы palette не тянула PDF engine в startup chunk. Проверки: check OK, vitest 95/95, build OK, smoke e2e 12/12, workflow e2e 6/6, full e2e 55 passed / 3 skipped.

- [x] **Round 5 Phase B saved workflow chains (2026-06-21)** — `/workflow` сохраняет шаблоны цепочек в `localStorage` только как `stepId` + sanitized options; файлы, имена файлов, uid и содержимое документов не сохраняются. Добавлены Save/Load/Delete UI, `workflow-storage.ts`, unit-тест sanitizer/storage и e2e reload/load сценарий. Проверки: check OK, vitest 93/93, workflow e2e 6/6, build OK, full e2e 51 passed / 3 skipped.

- [x] **Round 5 Phase A Workflow cancellation (2026-06-21)** — `runWorkflow()` принимает `AbortSignal`, добавлен `WorkflowAbortError`, `/workflow` показывает Cancel во время обработки и не продолжает цепочку после abort, добавлен unit-тест. Проверки: check OK, vitest 88/88, workflow e2e 4/4, build OK, full e2e 49 passed / 3 skipped.

- [x] **Round 6 Phase A registry-backed search + command palette (2026-06-21)** — главная страница фильтрует каталог через `searchToolRegistry()`, navbar получил `GlobalCommandPalette` с `Ctrl/⌘+K` и переходом на инструменты/Workflow, hero copy приведён к продуктовому обещанию промпта. Проверки: check OK, vitest 87/87, smoke e2e 8/8. См. ADR-015.

- [x] **Round 4 Phase A output validation + result report (2026-06-20)** — добавлен `client/src/tools/shared/output.ts`, `tool-page.tsx` валидирует результат по registry output metadata перед `done`, показывает compact report (input/output/format/saved), добавлен `output.test.ts`. Проверки: check OK, vitest 87/87, build OK, e2e 47 passed / 3 skipped.

- [x] **Round 3 Phase A execution-layer cleanup (2026-06-20)** — `worker-client.ts` снимает abort listener после settle/postMessage failure, abort одного задания реджектит все pending-задачи перед worker termination, добавлен тестируемый `canUsePdfWorker()` и `worker-client.test.ts`. Проверки: check OK, vitest 83/83.

- [x] **Round 2 Phase B typed client registry facade (2026-06-20)** — добавлены `client/src/tools/types.ts`, `registry.ts`, `search-index.ts`: typed metadata facade поверх текущего `tools.ts` с maturity, limits, output, execution mode/worker op и EN/RU search keywords. `registry.test.ts` сверяет UI-каталог, shared sitemap registry и typed registry. Проверки: check OK, vitest 81/81. См. ADR-014.

- [x] **Round 2 Phase A shared sitemap registry (2026-06-20)** — добавлен `shared/tool-registry.ts` для sitemap-facing slug/static pages/lang codes, `server/routes.ts` строит sitemap из shared registry, добавлен `tool-registry.test.ts`, ADR-013 фиксирует правило. Проверки: check OK, vitest 77/77.

- [x] **Round 1 Phase B maturity + upload risk (2026-06-20)** — добавлены вычисляемые статусы зрелости Stable/Beta/Experimental для всех инструментов, UI-бейджи на карточках и tool page, risk estimate для крупных файлов в upload-зоне, unit-тесты `tools.test.ts` и `upload-limits.test.ts`. Проверки: check OK, vitest 75/75.

- [x] **Round 1 Phase A privacy/logs/sitemap (2026-06-20)** — убраны client debug logs preview, worker fallback warning ограничен dev-режимом, recent files больше не сохраняют полные имена файлов, privacy policy синхронизирована с кодом, `/workflow` добавлен в sitemap. CSP проверен, изменений не потребовалось. Проверки: check OK, vitest 70/70, build OK, e2e 47 passed / 3 skipped.

- [x] **Round 0 первичный аудит перед рефакторингом (2026-06-20)** — создан `docs/audit-before-refactor.md`: baseline git/node/npm, check/test/build/e2e, инструменты/категории, worker/main-thread карта, размеры ключевых файлов/chunks, localStorage/runtime surfaces, лимиты и известные проблемы. Проверки: install OK, check OK, vitest 70/70, build OK, e2e 47 passed / 3 skipped.

- [x] **#2 Fidelity pdf-to-word/excel — Phase B (2026-06-12)** — `detectTableRegions` (чистый, тестируемый: ≥2 смежных строк × ≥2 ячейки × ≥2 колонки, нетабличная строка разрывает регион) + `tableRegionToXml` эмитит `<w:tbl>` с границами/сеткой/ячейками в `pdfToWord`; нетабличные строки — прежним путём Phase A. Защита от ложных таблиц (проза/одиночные строки не срабатывают). tsc 0 · vitest 56/56 · build OK. Phase C (картинки) — далее. См. ADR-012.

- [x] **#2 Fidelity pdf-to-word/excel — Phase A (2026-06-12)** — `extractPdfLayout` обогащён стилем (fontSize из transform, bold/italic из имени шрифта) и геометрией (ширина страницы, выравнивание строки). `pdfToWord` теперь эмитит размеры шрифтов, заголовки (≥1.3× медианы → bold), styled-runs и `w:jc`. `pdfToExcel` кластеризует x-границы в общие колонки (`clusterColumns`/`assignToColumn`) → таблицы выравниваются между строками. Новые чистые хелперы покрыты юнит-тестами. Browser-only, без новых пакетов. tsc 0 · vitest 52/52 · build OK. Phase B (таблицы→`w:tbl`) и C (картинки) — отложены. См. ADR-012.

- [x] **#3 Workflow-цепочки (2026-06-12)** — новый движок `client/src/lib/workflow-engine.ts` (реестр `WORKFLOW_STEPS` из 14 сцепляемых PDF→PDF шагов поверх существующих функций `pdf-utils`, `bytesToFile`-адаптер, `runWorkflow` с авто-merge при >1 файле и статусами по шагам, 4 пресета) + страница `client/src/pages/workflow-page.tsx` (конструктор: upload, палитра, упорядоченный пайплайн с опциями, пресеты, прогресс, скачивание). Маршрут `/workflow` (lazy) + ссылка в navbar. Browser-only, без новых пакетов, логика инструментов не дублируется. tsc 0 · vite build OK (отдельный чанк 20.35 kB) · E2E `workflow.spec.ts` 4/4 (desktop+mobile). См. ADR-011. Остаётся ручной прогон цепочки с реальным PDF.

- [x] **#1 Реальное сжатие картинок в Compress PDF (2026-06-12)** — `compressPdf` раньше делал только структурную оптимизацию (object streams), картинки не трогал → на фото/сканах выигрыш ~0. Теперь: **Smart** (low/medium) `recompressEmbeddedImages()` пережимает встроенные JPEG (DCTDecode) — даунсемпл + перекодирование, текст/вектор сохраняются; **Rasterize** (high) `rasterizeToCompressedPdf()` — страница→JPEG через pdfjs, максимум сжатия. Защиты: пропуск <8КБ, масок/прозрачности, CMYK (`jpegComponentCount` по SOF), замена только если меньше. Browser-only, без новых пакетов. tsc 0 · vite build OK. Остаётся ручной тест в браузере на фото-PDF.

- [x] **BUG: пробел в инлайн-редакторе текста edit-pdf (2026-06-07)** — `measureEditorTextWidth` через canvas `measureText` отбрасывал хвостовые пробелы; авто-подгонка ширины + `overflow:hidden` у textarea клипали набранный в конце пробел («пробел не сдвигает шрифт»). Хвостовой ран пробелов/табов добавляется к измеренной ширине явно. tsc 0. Подтверждение — ретест в браузере.
- [x] **Топ-10 популярных + плавность UI + аудит багов (2026-06-07)** — секция «Популярные инструменты» (`getPopularTools`/`POPULAR_TOOL_SLUGS`) в первых рядах главной; `ToolCard` → `React.memo`, убран `layout`-проп каталога (быстрее/плавнее). Аудит функций (6 агентов + ручная верификация) → исправлено 10 реальных багов: утечка `loadingTask` в `extractPdfLayout`, потеря добавленных страниц в `pdfDiff`, запись чужих метаданных в `pdf-metadata`, магическое `999` в `split-pdf`, центрирование `addWatermark`, origin/clamp в `cropPdf`, сортировка глав `splitByChapters`, overflow `formatBytes`, guard'ы `pdfImagesAsZip`/`signPdf`. tsc 0 · vitest 39/39 · build OK · e2e 43 passed/3 skipped. Детали и список отклонённых ложных находок — в changelog.

- [x] **BUG: pdfjs `getOrInsertComputed is not a function` (2026-06-05)** — в реальном браузере инструменты падали (проявилось на `pdf-to-pptx`): pdfjs-dist 5.5.207 (modern build) вызывает `Map.prototype.getOrInsertComputed` (TC39 upsert-предложение), которого нет в стабильных браузерах и Node 24. Не ловилось e2e, т.к. Playwright-Chromium новее и имеет метод. Фикс: side-effect полифилл `client/src/lib/map-polyfill.ts` (Map/WeakMap `getOrInsert`/`getOrInsertComputed`, no-op при нативной поддержке), импортируется первым в `main.tsx` и `workers/pdf-worker.ts`. tsc 0 · build OK · worker-tools e2e 16/16. Финальное подтверждение — ретест в браузере пользователя.
- [x] **Web Workers (Round 17, 2026-06-04)** — инфраструктура `client/src/workers/` (pdf-worker-types, pdf-worker, worker-client) + canvas-абстракция в pdf-utils. Перенесены grayscalePdf/invertColors/pdfToImages. Кнопка «Отменить»/«Cancel» в tool-page. `worker.format: "es"` в vite.config. check/test/build — все зелёные. См. ADR-010.
- [x] **Web Workers Round 18 (2026-06-04)** — перенесены ещё 5 функций через `runPdfTask`+fallback: scannerEffect, removeBlankPages, nUpPdf, toSinglePage, bookletImposition. check/test/build — зелёные.
  - [x] **Следующий шаг выполнен (Round 21)**: `pdfToPptx` перенесён в воркер; `ocrPdf` оставлен на main thread (вложенные воркеры tesseract нежизнеспособны).
  - [x] Все кандидаты на перенос обработаны: canvas-зависимые — в воркере; OCR — на main thread по техпричине.
- [x] **Web Workers Round 21 (2026-06-05)** — `pdfToPptx` перенесён в воркер (runPdfTask+fallback, canvas-абстракция; e2e подтвердил worker-путь без fallback). `ocrPdf` проверен и **оставлен на main thread** — tesseract вложенные воркеры не стартуют в module-воркере (worker-путь всегда падал в fallback); функция откатана к исходной. Полный e2e baseline (оба проекта) зелёный (41 passed / 3 skipped). check/test/build — зелёные.
  - Миграция в Web Worker завершена: все canvas-зависимые инструменты в воркере, кроме OCR (по техпричине).
- [x] **Web Workers Round 20 (2026-06-05)** — перенесён `redactPdf` (последний canvas-кандидат) через `runPdfTask`+fallback; canvas → абстракция; e2e +redact-pdf (15/15). check/test/build — зелёные. В main thread осталось только `pdfToPptx` и `ocrPdf` (нужны вложенные воркеры).
- [x] **Web Workers Round 19 (2026-06-05)** — перенесены `comparePdf`, `autoRedactPdf`, `pdfDiff` через `runPdfTask`+fallback. Двухфайловые (compare/diff) — второй файл в `args[0]`. comparePdf/autoRedactPdf переведены на canvas-абстракцию. Исправлен detach-баг в autoRedactPdf (копия буфера до `getDocument`). E2E расширен (14/14). check/test/build — зелёные.
  - [x] **Следующий шаг выполнен (Round 21)**: `pdfToPptx` перенесён в воркер; `ocrPdf` оставлен на main thread (вложенные воркеры tesseract нежизнеспособны).
- [x] **E2E-верификация worker-пути (2026-06-05)** — `tests/e2e/worker-tools.spec.ts` (Playwright): 8 worker-инструментов дают download без fallback-warning, выделенный `pdf-worker` реально спавнится, Cancel прерывает задачу. 11/11 зелёные. Подтверждено, что Round 17–18 миграция работает в браузере, а не только на уровне check/test/build.
- [x] **BUG: embedPages на пустых страницах (2026-06-05)** — `toSinglePage`/`bookletImposition` падали с `Can't embed page with missing Contents` на странице без content-stream (booklet — на любом PDF с числом страниц не кратным 4 из-за padding). Добавлен helper `pageHasContents()`, пустые/padding-страницы пропускаются. Предсуществующий баг, не связан с миграцией.
- [x] **BUG: removeBlankPages «No PDF header found» (2026-06-05)** — pdfjs детачил буфер `bytes`, затем `PDFDocument.load(bytes)` получал пустой буфер. bytes перечитываются из файла для pdf-lib.
- [x] **Тема light-only** — подтверждено пользователем (2026-06-03): тёмная тема не нужна, остаётся light-only. e2e-тест приведён в соответствие.

---

## ✅ Завершённые задачи (Round 16, 2026-06-02)

- [x] Мобильная адаптация edit-pdf: горизонтально-прокручиваемый тулбар, выдвижной drawer миниатюр, адаптивные отступы, скрытие подсказки хоткеев
- [x] Skeleton loading для маршрутов (адаптивный Suspense fallback в App.tsx)
- [x] Аудит: keyboard shortcuts, SEO per-tool, 404-страница — уже были реализованы

---

## ✅ Завершённые задачи (Round 13, 2026-06-02)

- [x] BUG-01: auto-redact на ротированных страницах — исправлен (canvas-based подход)
- [x] Unit-тесты для pdf-utils (22→39 тестов)
- [x] TD-02 Phase 4: useEditorSave hook извлечён (2325→2278 строк)
- [x] Виртуализация списка инструментов на главной (useLazyRender)
- [x] Drag-and-drop reorder в FileUpload (merge-pdf и др.)

---

## ✅ Завершённые задачи (Round 13, 2026-06-02)

- [x] BUG-01: auto-redact на ротированных страницах — исправлен (canvas-based подход)
- [x] Unit-тесты для pdf-utils (22→39 тестов)
- [x] TD-02 Phase 4: useEditorSave hook извлечён (2325→2278 строк)

---

## ✅ Завершённые задачи (Round 11-12, 2026-06-02)

- [x] TD-02 Phase 3: useEditorHistory + useEditorSignature hooks извлечены (2575→2325)
- [x] Удалены 9+ неиспользуемых npm-зависимостей
- [x] og:image + twitter:image метатеги в useSeo и index.html
- [x] Skip-link для клавиатуры (a11y)

---

## ✅ Завершённые задачи (Round 10, 2026-06-02)

- [x] TD-02 Phase 2: Find&Replace extracted to use-find-replace.ts hook (2776→2575 строк)

---

## ✅ Завершённые задачи (Round 9, 2026-06-02)

- [x] TD-02 Phase 1: Извлечены типы/утилиты из edit-pdf-page.tsx → edit-pdf-types.ts + edit-pdf-utils.ts
- [x] Аудит: Удалены неиспользуемые импорты (tool-page.tsx, edit-pdf-page.tsx, tools.ts)
- [x] Аудит: Удалён мёртвый код (mergePdfByteArrays, redactPdfLegacy)
- [x] Аудит: privacy.tsx/terms.tsx — адаптивные цвета для всех тем
- [x] Аудит: Удалён фейковый aggregateRating из schema.org
- [x] Аудит: useSeo() добавлен на 404-страницу
- [x] Аудит: Добавлены robots.txt и sitemap.xml

---

## ✅ Завершённые задачи (Round 8, 2026-06-02)

- [x] TD-11: Find&Replace белая маска через canvas measureText вместо character-ratio (точное позиционирование)
- [x] E2E-тесты rotation-фиксов: crop-pdf и redact-pdf на повёрнутом PDF (/Rotate 90) — 2/2 пройдены (OCR skip — слишком медленный для CI)

---

## ✅ Завершённые задачи (Round 7, 2026-06-01)

- [x] PWA offline: настроен vite-plugin-pwa (autoUpdate, precache, runtimeCaching для CDN tesseract)
- [x] Исправлена сломанная иконка манифеста (favicon.ico → favicon.png)
- [x] BUG-04 (CRASH): Rules of Hooks в tool-page.tsx — useEffect после ранних return
- [x] BUG-05: дублирующийся done-summary блок в tool-page.tsx
- [x] BUG-06: bookletImposition sheetW = pageH*2 → pageW*2
- [x] BUG-07: resizePages NaN guard для вырожденных страниц
- [x] Полный аудит: tsc 0, vitest 22/22, структура чиста (57 tools)
- [x] BUG-08: rotation-обработка в redactPdf (4-угловой бокс), cropPdf (convertToPdfPoint), ocrPdf+ocrPdfLegacy (convertToPdfPoint) — корректно на /Rotate
- [x] BUG-09: ocrPdfLegacy worker.terminate() обёрнут в try/finally
- [x] TD-09: удалён дубль public/manifest.json (активен manifest.webmanifest от плагина)

- [x] TD-10: удалён мёртвый код в edit-pdf-page.tsx (недостижимый блок 1504-1564 после return; неиспользуемый handleCanvasClick с битым Fabric-API)
- [x] TD-12: удалена мёртвая функция ocrPdfLegacy

### 🟡 Найдено аудитом, требует подтверждения владельца (не исправлено)
- [x] TD-11: Find&Replace белая маска через canvas measureText вместо character-ratio (исправлено)

---

## ✅ Завершённые задачи (этой сессией)

- [x] Добавить 11 новых функций в pdf-utils.ts (cropPdf, getPdfMetadata, setPdfMetadata, comparePdf, removeBlankPages, resizePages, grayscalePdf, pdfBookmarks, autoRedactPdf, nUpPdf, splitBySize, overlayPdf)
- [x] Подключить 16 инструментов в tool-page.tsx (state, switch, download, JSX)
- [x] Добавить EN+RU переводы для 7 отсутствовавших инструментов (invert-colors, to-single-page, remove-images, form-fill, split-by-chapters, booklet-imposition, scanner-effect)
- [x] Исправить TypeScript-ошибки (PDFDict type, canvas param, dest type)
- [x] Верификация: npx tsc --noEmit → 0 ошибок
- [x] Добавить 4 новых инструмента: pdf-to-markdown, add-background, pdf-diff, pdf-to-audio
- [x] TD-05: Удалены 9 мёртвых зависимостей + 3 мёртвых файла
- [x] TD-06: compare/overlay hidden file input с name + remove button
- [x] BUG-03: split-by-size возвращает PDF при 1 части
- [x] UX: Keyboard shortcuts help popup (Shift+/)
- [x] TD-07: CI/CD GitHub Actions (.github/workflows/ci.yml)
- [x] 57 функций audited, 3 бага исправлены, yieldToUI в 6 циклах
- [x] BUG-01 (autoRedact): пропорциональное позиционирование масок
- [x] addBlankPages: размер страницы берётся из оригинала
- [x] resizePages: векторное масштабирование через pdf-lib
- [x] Визуальные превью страниц для `delete-pages`, `extract-pages`, `reorder-pages`
- [x] Метрика сжатия в `compress-pdf` — "Сохранено X KB (Y%)"
- [x] Добавить `compare-pdf` — сравнение двух PDF side-by-side
- [x] Добавить `remove-blank-pages` — авто-удаление пустых страниц
- [x] Добавить `resize-pages` — масштабирование до A4/A3/Letter и др.
- [x] Добавить `grayscale-pdf` — перевод в оттенки серого
- [x] Добавить `pdf-bookmarks` — просмотр/экспорт TOC
- [x] Find & Replace в `edit-pdf` (Ctrl+F) — поиск с хайлайтом, замена, замена всех
- [x] Добавить `repair-pdf` — восстановление повреждённого PDF
- [x] Добавить `flatten-pdf` — фиксация полей формы
- [x] Добавить `auto-redact` — авто-маскировка email/phone/SSN/IBAN/regex
- [x] Добавить `n-up-pdf` — 2 или 4 страницы на лист
- [x] Добавить `split-by-size` — разбивка по размеру файла → ZIP
- [x] Добавить `invert-colors` — инверсия цветов PDF
- [x] Добавить `to-single-page` — все страницы в одну длинную
- [x] Добавить `remove-images` — удаление изображений из PDF
- [x] Добавить `form-fill` — заполнение полей PDF форм
- [x] Добавить `split-by-chapters` — разбивка по главам/закладкам → ZIP
- [x] Добавить `booklet-imposition` — перекладка для брошюрной печати
- [x] Добавить `scanner-effect` — эффект сканера с интенсивностью
- [x] Добавить `overlay-pdf` — наложение PDF поверх PDF с прозрачностью
- [x] Создать систему памяти AI-агентов (.ai/ директория)
- [x] Создать AGENTS.md, CLAUDE.md, AGENT.md, .cursor/rules/, .github/copilot-instructions.md
- [x] Добавить `sanitize-pdf` — удаление метаданных, JavaScript и трекинга для конфиденциальности

---

## 🔴 Технический долг (требует внимания)

### Высокий приоритет

| # | Проблема | Файл | Описание |
|---|---|---|---|
| TD-02 | edit-pdf-page.tsx монолит | `edit-pdf-page.tsx` | 2278 строк — Phases 1-4 выполнены. Дальнейшая декомпозиция даст меньший выигрыш. |

### Низкий приоритет

| # | Проблема | Файл | Описание |
|---|---|---|---|
| TD-06 | ~~compare/overlay input~~ | `tool-page.tsx` | ✅ Исправлено |
| TD-07 | ~~Нет CI/CD~~ | — | ✅ CI/CD GitHub Actions настроен |
| TD-08 | ~~autoRedact координаты~~ | `pdf-utils.ts` | ✅ Исправлено |

---

## 💡 Идеи улучшений (Backlog)

### Новые инструменты (браузер, реализуемо)
- [x] `pdf-to-pptx` — Конвертация страниц PDF в слайды PowerPoint (уже реализован)
- [x] `pdf-to-markdown` — Извлечение текста в Markdown формат (уже реализован)
- [x] `pdf-diff` — Цветное diff-сравнение двух PDF (уже реализован)
- [x] `pdf-to-audio` — Text-to-speech через Web Speech API (уже реализован)
- [x] `add-background` — Добавление цветного фона (уже реализован)
- [x] `remove-images` — Удаление изображений из PDF (уже реализован)

### UX улучшения
- [x] Drag-and-drop порядка файлов в merge-pdf
- [x] Предпросмотр результата до скачивания (уже реализован — previewDataUrl для PDF)
- [x] История последних файлов (localStorage) — уже реализовано (useRecentFiles)
- [x] Прогресс-бар для split-by-size (уже реализован — onProgress)
- [ ] Keyboard shortcuts help popup

### Технические улучшения
- [x] Web Workers для тяжёлых операций (Round 17, 2026-06-04) — инфра + grayscale/invert/pdfToImages, остальное в backlog
- [x] Service Worker + PWA (vite-plugin-pwa уже настроен)
- [x] Виртуализация списка инструментов на главной (useLazyRender)
- [x] Ленивая загрузка tool-page.tsx (уже dynamic import)

---

## 🐛 Известные баги

| # | Баг | Воспроизведение | Приоритет |
|---|---|---|---|
| BUG-01 | ~~auto-redact неточно на ротированных страницах~~ | `pdf-utils.ts` | ✅ Исправлено: переписан на canvas-based подход |
| BUG-02 | Find & Replace ищет только по исходному тексту | Добавленный в редакторе текст не ищется | Низкий (ожидаемое поведение) |
| BUG-03 | ~~split-by-size ZIP для 1 части~~ | ✅ Исправлено: при 1 части возвращается исходный PDF, при нескольких — ZIP |
| BUG-10 | ~~autoRedact split PII~~ | pdf-utils.ts | ✅ Исправлено: sliding window matching 1–3 items |
| BUG-11 | ~~sanitizePdf не удалял JS/tracking~~ | pdf-utils.ts | ✅ Исправлено: удаление OpenAction/AA/URI/JS/EmbeddedFiles |
| BUG-12 | ~~split-by-chapters скачивает как .zip при 1 главе~~ | tool-page.tsx | ✅ Исправлено: magic bytes check |
| BUG-13 | ~~pdfjs memory leaks в 12 функциях~~ | pdf-utils.ts | ✅ Исправлено: try/finally + destroy() |
