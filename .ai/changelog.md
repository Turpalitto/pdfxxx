# PDFX — Changelog

> История изменений проекта. Обновляется после каждого значимого изменения.

---

## 2026-06-22 — UX: PDF to Audio OCR guidance

### Изменено
- `pdf-to-audio` получил явное пояснение, что инструмент озвучивает выделяемый текст через speech synthesis в браузере и не создаёт аудиофайл для скачивания.
- Sidebar "Как использовать" для `pdf-to-audio` больше не обещает скачивание результата; шаги теперь описывают выбор языка/скорости, запуск озвучивания и OCR fallback для сканов.
- Ошибка отсутствия выделяемого текста теперь локализуется в `tool-page.tsx` и прямо направляет пользователя сначала обработать скан через OCR PDF.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 122/122.
- `npx playwright test tests/e2e/smoke.spec.ts -g "pdf to audio explains"` — OK, 2/2.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 14/14.
- `npm run build` — OK, с существующим PostCSS warning.

---

## 2026-06-22 — BUG: reliable browser downloads

### Исправлено
- `downloadBlob()`, `downloadText()` и `downloadHtml()` теперь используют общий безопасный browser-download helper: временная ссылка добавляется в DOM, клик выполняется по DOM-элементу, а `URL.revokeObjectURL()` откладывается на следующий tick.
- Это исправляет сценарий, где кнопка скачивания результата (например `pdf-to-pptx`) могла не сработать в embedded/in-app browser окружении, хотя результат уже был готов.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 122/122.
- `npx playwright test tests/e2e/worker-tools.spec.ts -g "pdf-to-pptx"` — OK, 2/2; тест теперь ловит реальный browser download event и проверяет `.pptx`.
- `npm run build` — OK, с существующим PostCSS warning.

---

## 2026-06-22 — TD-02 Phase 5: Edit PDF copy extraction

### Добавлено
- `client/src/lib/edit-pdf-copy.ts`: typed copy factory для SEO и основного EN/RU UI-copy автономного Edit PDF редактора.

### Изменено
- `edit-pdf-page.tsx` больше не держит локальный объект `t` и SEO copy inline; компонент читает copy через `getEditPdfCopy()` / `getEditPdfSeoCopy()`.
- UX, маршруты, slug, Fabric/canvas pipeline, сохранение и стили редактора не изменялись.
- Дальнейший крупный hook-extraction намеренно не сделан в этом срезе: оставшаяся логика плотно связана через refs/state и дала бы 10+ параметров на hook.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 122/122.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/editor-mobile.spec.ts` — OK, 1 passed / 1 skipped.

---

## 2026-06-21 — Round 4 Phase J: image archive result adapters

### Добавлено
- `createToolImageArchiveResult()` в `client/src/tools/shared/process.ts`: typed adapter для ZIP-архивов изображений из data URL результатов.
- Unit-тесты фиксируют image ZIP packaging и запрет image archive adapter для неархивных output.

### Изменено
- `pdf-to-jpg`, `pdf-to-png` и `extract-images` в `tool-page.tsx` больше не вызывают `pdfImagesAsZip()` напрямую; ZIP-упаковка результата перенесена в process helper.
- Имена файлов внутри архива сохранены: `<base>-page-<page>.<format>`.
- После Phase J в `tool-page.tsx` не осталось ручных `TextEncoder`, `JSZip`, `splitResultsToZip` или `pdfImagesAsZip` result adapters.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 120/120.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase I: numbered split-pdf packaging adapter

### Добавлено
- `createToolNumberedPartsResult()` в `client/src/tools/shared/process.ts`: typed adapter для numbered split parts (`<base>-partN.pdf`) поверх shared named-parts packaging.
- `ToolNamedPartsResultOptions.singlePartMode` сохраняет старый контракт: `split-pdf` all/every-n скачивают ZIP даже при одной части.
- Unit-тест фиксирует ZIP packaging для numbered split parts.

### Изменено
- `split-pdf` all/every-n в `tool-page.tsx` больше не вызывает `splitResultsToZip()` напрямую; упаковка результата перенесена в process helper.
- Range-mode `split-pdf` сохранён как одиночный PDF result.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 118/118.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase H: metadata two-step adapter

### Добавлено
- `runToolMetadataEditTask()` в `client/src/tools/shared/process.ts`: typed helper для двухшагового `pdf-metadata` flow (`loaded(fields)` или `saved(bytes)`).
- Unit-тесты фиксируют load-before-save, save-after-load и запрет запуска metadata flow для других инструментов.

### Изменено
- `pdf-metadata` в `tool-page.tsx` больше не держит load/save branching напрямую в switch; страница только применяет результат helper к существующему UI state.
- Двухшаговый UX сохранён: первый запуск загружает поля и возвращает idle, второй сохраняет PDF bytes.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 117/117.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase G: special result adapters

### Добавлено
- `createToolNamedPartsResult()` в `client/src/tools/shared/process.ts`: typed adapter для split-like named parts; одна часть остаётся PDF, несколько частей собираются в ZIP.
- `runToolAudioSideEffectTask()` в `client/src/tools/shared/process.ts`: guard-helper для audio side-effect инструментов без downloadable result.
- Unit-тесты фиксируют single/multi split packaging, archive-output guard и audio-output guard.

### Изменено
- `split-by-chapters` в `tool-page.tsx` больше не собирает JSZip вручную; result shaping идёт через shared helper.
- `pdf-to-audio` выполняется через audio side-effect guard, сохраняя прежний speech synthesis UX и отсутствие download result.
- `pdf-metadata` намеренно оставлен на отдельный Phase H из-за двухшагового load/edit/save UI-state контракта.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 114/114.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase F: text-like process result adapters

### Добавлено
- `createToolTextResult()` в `client/src/tools/shared/process.ts`: typed adapter для text/html/json/markdown результатов на базе `ToolRegistryEntry.output`.
- Unit-тесты фиксируют mapping display target: text/json/markdown/bookmarks показываются как text, html — как html; binary output не может пройти через text adapter.

### Изменено
- `pdf-to-text`, `pdf-to-html`, `pdf-bookmarks`, `extract-forms` и `pdf-to-markdown` в `tool-page.tsx` больше не кодируют результат вручную через `TextEncoder`.
- Эти ветки теперь используют `runToolMainThreadTask()` для execution guard и `createToolTextResult()` для bytes + display target.
- UX, slug, download naming и output validation сохранены.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 109/109.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase E: registry-guarded main-thread process adapters

### Добавлено
- `runToolMainThreadTask()` в `client/src/tools/shared/process.ts`: typed guard-helper для main-thread инструментов.
- Unit-тесты фиксируют, что main-thread task исполняется без worker client, а hybrid/worker инструмент не может случайно пройти через main-thread path.

### Изменено
- Простые main-thread cases в `tool-page.tsx` теперь запускаются через `runToolMainThreadTask(registryEntry, ...)`.
- Сложные ветки со своим UI state/result shaping (`split-*`, text/html/json/metadata/audio/OCR) оставлены без изменения для отдельного безопасного среза.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 107/107.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase D: registry-backed worker invocation wrapper

### Добавлено
- `runToolWorkerTask()` в `client/src/tools/shared/process.ts`: общий typed wrapper над `runPdfTask()`, который берёт `workerOp` из `ToolRegistryEntry.execution`.
- Unit-тесты фиксируют, что worker-вызов использует registry metadata и падает для main-thread инструмента без `workerOp`.

### Изменено
- `tool-page.tsx` больше не передаёт строковые worker op (`"grayscalePdf"`, `"pdfToImages"` и т.п.) в каждом case; switch сохраняет UX/options/fallback, а worker op берётся из typed registry.
- Существующие fallback, progress, cancel и slug поведения сохранены.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 105/105.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase C: registry-backed process progress

### Добавлено
- `ToolExecutionDefinition.progress` в typed registry: `simulated` или `callback`.
- `client/src/tools/shared/process.ts` — helper `shouldSimulateToolProgress()` для process runner.
- Unit-тест `process.test.ts` фиксирует текущие callback-progress инструменты и worker-инструменты, которые пока сохраняют simulated progress.

### Изменено
- `tool-page.tsx` больше не держит локальный список `realProgressSlugs`; решение о симуляции прогресса берётся из `registryEntry.execution.progress`.
- Missing registry metadata теперь останавливает process runner до выполнения switch, а не только на output validation.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 103/103.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 4 Phase B: registry-backed download runner

### Добавлено
- `client/src/tools/shared/download.ts` — чистый typed planner для скачивания результата по `ToolRegistryEntry.output` и минимальному контексту инструмента.
- Unit-тест `download.test.ts` покрывает text/html/json, office blob, image ZIP и динамические split PDF/ZIP имена.

### Изменено
- `tool-page.tsx` больше не держит ручную матрицу filename/mime для `handleDownload`; компонент только вызывает `downloadBlob`/`downloadText`/`downloadHtml` по готовому плану.
- Сохранено прежнее UX-поведение имён: `-pdfx`, `-pdfx-images.zip`, `-split.zip`, `-split-by-size.zip`, `-chapters.*`.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 100/100.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 6 Phase B: command palette presets + recent tools

### Добавлено
- `client/src/components/command-palette-sources.ts` — lightweight command sources для Workflow presets и recent tools без импорта PDF engine.
- `client/src/lib/workflow-presets.ts` — лёгкий metadata-модуль для Workflow preset titles/descriptions/stepIds; `workflow-engine.ts` re-export сохраняет совместимость.
- Command palette показывает Workflow presets и privacy-safe recent tools.
- `/workflow?preset=<id>` применяет preset и собирает pipeline автоматически.
- Unit-тест `command-palette-sources.test.ts` проверяет deep links и отсутствие приватных имён файлов в recent commands.
- Smoke E2E проверяет preset navigation и recent tool command без показа исходного имени файла.

### Изменено
- `use-recent-files.ts` получил `loadRecentFiles()` и typed sanitizer для чтения legacy localStorage как недоверенного JSON.
- Command palette обновляет recent tools при открытии, не сохраняя и не читая содержимое документов.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 95/95.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 12/12.
- `npx playwright test tests/e2e/workflow.spec.ts` — OK, 6/6.
- `npm run build` — OK, с существующим PostCSS warning; startup chunk не тянет PDF engine через presets.
- `npm run test:e2e` — OK, 55 passed / 3 skipped.
- `git diff --check` — OK.
- Guard: `client/src/index.css` и `client/src/lib/tools.ts` без изменений.

---

## 2026-06-21 — Round 5 Phase B: saved workflow chains

### Добавлено
- `client/src/lib/workflow-storage.ts` — безопасное сохранение workflow-цепочек в `localStorage` как `stepId` + sanitized options, без файлов, имён файлов, uid и байтов документов.
- UI на `/workflow`: поле имени, Save chain, список сохранённых цепочек, Load/Delete.
- Unit-тест `workflow-storage.test.ts` на sanitizer, повреждённый JSON, удаление и восстановление свежих React uid.
- E2E-сценарий workflow на сохранение, reload и загрузку цепочки обратно в конструктор.

### Ограничение
- Сохраняется только шаблон цепочки. Перед запуском пользователь заново загружает PDF; документы не восстанавливаются из storage.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 93/93.
- `npx playwright test tests/e2e/workflow.spec.ts` — OK, 6/6.
- `npm run build` — OK, с существующим PostCSS warning.
- `npm run test:e2e` — OK, 51 passed / 3 skipped.

---

## 2026-06-21 — Round 5 Phase A: Workflow cancellation

### Добавлено
- `WorkflowAbortError` и `RunWorkflowOptions.signal` в `workflow-engine.ts`: workflow runner теперь может останавливаться перед стартом и между шагами.
- Кнопка Cancel на `/workflow` во время обработки.
- Unit-тест `workflow-engine.test.ts` на distinguishable abort error.

### Ограничение
- Отмена cooperative: уже начатая синхронная PDF-функция может завершиться, но цепочка не продолжит следующий шаг и не покажет устаревший результат после abort.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 88/88.
- `npx playwright test tests/e2e/workflow.spec.ts` — OK, 4/4.
- `npm run build` — OK, с существующим PostCSS warning.
- `npm run test:e2e` — OK, 49 passed / 3 skipped.

---

## 2026-06-21 — Round 6 Phase A: registry-backed search + command palette

### Добавлено
- `GlobalCommandPalette` в navbar: `Ctrl/⌘+K`, поиск по registry-backed index, быстрый переход на инструмент и Workflow.
- Поиск по каталогу на главной странице через `searchToolRegistry()` с EN/RU task keywords и локализованными названиями/описаниями.
- E2E smoke coverage для home search и command palette navigation на desktop/mobile.

### Изменено
- Hero copy на главной приведён ближе к продуктовому обещанию промпта: все PDF-действия в одном месте, локальная обработка на устройстве.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 87/87.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright test tests/e2e/smoke.spec.ts` — OK, 8/8.
- `npm run test:e2e` — OK, 49 passed / 3 skipped.

---

## 2026-06-20 — Round 4 Phase A: output validation + result report

### Добавлено
- `client/src/tools/shared/output.ts` — единая проверка выходных файлов перед показом состояния `done`: PDF signature, ZIP/Office container signature, non-empty output для text/html/json/markdown.
- Compact result report в `tool-page.tsx`: input size, output size, output format, saved percent.
- Unit-тест `output.test.ts` на PDF/ZIP/Office validation и size report.

### Изменено
- `tool-page.tsx` использует output metadata из typed registry для валидации результата и отчёта, без изменения самих PDF-функций.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 87/87.
- `npm run build` — OK, с существующим PostCSS warning.
- `npm run test:e2e` — OK после повторного запуска с увеличенным timeout, 47 passed / 3 skipped. Первый запуск был прерван runner-timeout и дал `EPIPE`, без test failure.

---

## 2026-06-20 — Round 3 Phase A: execution-layer cleanup

### Исправлено
- `worker-client.ts` теперь снимает `AbortSignal` listener после успешного завершения, ошибки или `postMessage` failure.
- Abort одного worker-задания больше не очищает остальные pending-задания без reject: termination теперь реджектит все ожидания через общий `WorkerAbortError`.

### Добавлено
- `canUsePdfWorker()` — тестируемый helper проверки runtime-capabilities (`Worker`, `OffscreenCanvas`, `URL`) без прямой привязки к `globalThis`.
- Unit-тест `worker-client.test.ts` на worker capability и отличимый abort error.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 83/83.

---

## 2026-06-20 — Round 2 Phase B: typed client registry facade

### Добавлено
- `client/src/tools/types.ts` — строгие типы для tool registry: category, maturity, execution mode, output definition, limits, search keywords.
- `client/src/tools/registry.ts` — typed facade поверх существующего `tools.ts`, вычисляет maturity, limits, output, execution mode/worker op и EN/RU search metadata.
- `client/src/tools/search-index.ts` — единый search helper по slug/category/output/maturity и локализованным EN/RU названиям/описаниям.
- `client/src/tools/registry.test.ts` — проверяет совпадение UI-каталога, typed registry и shared sitemap registry, а также worker metadata и RU/EN поиск.
- ADR-014 — правило постепенного переноса метаданных через typed registry facade без массового переписывания `tools.ts`.

### Проверка
- `npm run check` — OK.
- `npm test -- --run` — OK, 81/81.

---

## 2026-06-20 — Round 1 Phase A: privacy/logs/sitemap quick fixes

### Исправлено
- Убраны debug `console.log` из preview generation в `tool-page.tsx`; неуспешная генерация preview теперь просто отключает preview без production console noise.
- Worker fallback warning в `worker-client.ts` оставлен только для dev-режима (`import.meta.env.DEV`).
- `use-recent-files.ts` больше не сохраняет полные имена файлов в localStorage: новые и старые записи приводятся к generic label (`PDF file` и т.п.) + size/slug/time.
- Privacy policy обновлена под фактическое хранение recent-file metadata без полного имени файла, содержимого PDF и самого файла.
- `/workflow` добавлен в динамический sitemap (`server/routes.ts`) и в статический `client/public/sitemap.xml`.

### Проверка
- `npm run check` — OK.
- `npm test` — OK, 70/70.
- `npm run build` — OK, с существующим PostCSS warning.
- `npm run test:e2e` — OK, 47 passed / 3 skipped.

---

## 2026-06-20 — Round 1 Phase B: maturity + upload risk

### Добавлено
- `getToolMaturity()` / `getToolMaturityLabel()` в `tools.ts`: каждый инструмент получает вычисляемый статус `Stable` / `Beta` / `Experimental` без изменения slug и цветовой палитры.
- UI-статусы зрелости на карточках инструментов и странице инструмента.
- `estimateUploadRisk()` / `highestUploadRisk()` в `upload-limits.ts`: предупреждение о крупных файлах в upload-зоне на основе доли от текущего лимита.
- Unit-тесты `tools.test.ts` и `upload-limits.test.ts`.

### Проверка
- `npm run check` — OK.
- `npm test` — OK, 75/75.

---

## 2026-06-20 — Round 2 Phase A: shared sitemap registry

### Добавлено
- `shared/tool-registry.ts` — pure registry для `LANG_CODES`, `STATIC_PAGES` и `TOOL_SLUGS`, пригодный для server-side sitemap без React/lucide зависимостей.
- `tool-registry.test.ts` — сверяет shared `TOOL_SLUGS` с UI-каталогом `tools.ts` и проверяет наличие `/workflow` в static pages.
- ADR-013 — правило: sitemap-facing slug проходят через shared registry.

### Изменено
- `server/routes.ts` больше не держит ручной список tool slug; `/sitemap.xml` строится из shared registry.

### Проверка
- `npm run check` — OK.
- `npm test` — OK, 77/77.
- `npm run test:e2e` — OK, 47 passed / 3 skipped.

---

## 2026-06-20 — Round 0: первичный аудит перед поэтапным рефакторингом

### Добавлено
- `docs/audit-before-refactor.md` — baseline текущего состояния перед раундами: git/node/npm, check/test/build/e2e, количество инструментов и категорий, worker/main-thread карта, размеры ключевых файлов и production chunks, localStorage/runtime surfaces, лимиты файлов и известные проблемы.

### Проверка
- `npm install` — OK, зависимости актуальны; npm audit сообщает 3 уязвимости (1 low, 1 moderate, 1 high), без автолечения зависимостей.
- `npm run check` — OK.
- `npm test` — OK, 70/70.
- `npm run build` — OK, с существующим PostCSS warning.
- `npx playwright install chromium` — OK.
- `npm run test:e2e` — OK, 47 passed / 3 skipped.

---

## 2026-06-18 — SEO + bates-numbering инструмент

### SEO для 12 языков
- **sitemap.xml** (`server/routes.ts`): `LANG_CODES` расширен с 2 до 12 (en/ru/es/fr/de/pt/zh/ja/ko/ar/hi/tr), `TOOL_SLUGS` синхронизирован с полным каталогом (~57 slug). hreflang `<xhtml:link>` для каждого языка + x-default.
- **home.tsx**: `useSeo` теперь использует `t.hero.headline*` и `t.hero.sub` из i18n вместо hardcoded en/ru — title/description на всех 12 языках.
- **hreflang** в `use-seo.ts` уже работал динамически через `LANGUAGES.map` — автоматически covers 12 языков.

### Новый инструмент: bates-numbering
- **`tools.ts`**: slug `bates-numbering`, category `utility`, color `slate`, иконка `ClipboardList`
- **`pdf-utils.ts`**: `batesNumbering(file, options)` — prefix + zero-padded number + suffix, 5 позиций, настраиваемые digits/fontSize/margin/color/opacity
- **`tool-page.tsx`**: state (batesPrefix/Start/Digits/Suffix/Position/FontSize), switch case, UI блок с превью, deps array
- **`tool-translations.ts`**: переводы для en/ru/es/fr/de/pt/zh/ja/ko/ar/hi/tr (10 новых языков)
- **`server/routes.ts`**: bates-numbering добавлен в TOOL_SLUGS
- **Тесты**: 2 новых, всего 70/70

### Проверка
- tsc 0 · vitest 70/70 · build OK

### edit-pdf декомпозиция
- Phase 1-4 уже выполнены (типы, утилиты, use-find-replace, use-editor-history, use-editor-signature, use-editor-save). Phase 5 (дальнейшая декомпозиция хуков с 10+ параметрами) — выигрыш мал, оставлено. Файл 2733 строк (вырос из-за новых фич).

---

## 2026-06-18 — Feature #2 Phase C+: pdf-to-word улучшения

### Зачем
Phase C добавил цвет и сканы, но конверсия на реальных PDF страдала от: фиксированного A4-размера, отсутствия отступов между параграфами, потери шрифтов.

### Что сделано
- **`<w:pgSz>` из PDF**: размер страницы берётся из первой PDF-страницы вместо фиксированного A4 (11906×16838)
- **`<w:spacing>`**: заголовки — `w:before="240" w:after="120"`, обычные — `w:after="120"`
- **`<w:rFonts>`**: fontFamily из pdfjs-стилей передаётся в Word-шрифты (`w:ascii`, `w:hAnsi`, `w:cs`)
- **Smart scan detection**: вместо порога `< 3 строки` — оценка плотности текста (`textDensity < 0.02` или `< 3 строк`)
- **`fontFamily`** в `PdfLayoutItem` и `StyledRun`, grouping по fontFamily в `itemsToStyledRuns`

### Проверка
- tsc 0 · vitest 68/68 · build OK

## 2026-06-17 — Feature #6 (OCR) + #4 (языки) + #2 Phase C (цвет + сканы в Word)

### #6 OCR: адаптивный масштаб + мультиязычный UI
- **`ocrRenderScale()`** в `pdf-utils.ts`: адаптивный масштаб вместо фиксированного `scale=2` — целевой long side 1800px, clamped в `[0.5, 3]`
- **tool-page.tsx**: `ocrLanguage` → `ocrLanguages` (массив), 16 языков (ukr, pol, nld, tur, ces, chi_sim, jpn, kor добавлены), чекбоксы вместо селекта

### #4 Языки: 10 новых в LANGUAGES
- `es, fr, de, pt, zh, ja, ko, ar, hi, tr` добавлены в `LANGUAGES` (i18n.ts)
- RTL для арабского (`RTL_LANGS = new Set(["ar"])`)
- Переводы hero/nav + tool-translations уже были полные для 18 языков

### #2 Phase C: цвет текста + сканы в pdf-to-word
- **`PdfLayoutItem`** и **`StyledRun`**: добавлено опциональное поле `color` (hex, без `#`)
- **`extractPageColors()`**: парсинг `getOperatorList()` — отслеживает fill color (RGB/Gray/CMYK) перед текстовыми операторами. Цвет подставляется в соответствующий text item через rawIdx.
- **`fillColorToHex()`**: конвертация RGB/Gray/CMYK → hex, пропуск чёрного и белого
- **`itemsToStyledRuns()`**: runs сгруппированы ещё и по цвету; цвет передаётся в `lineToParagraphXml`
- **`lineToParagraphXml()`**: `<w:color w:val="..."/>` в `<w:rPr>` для цветного текста
- **`cellsWithX()`** + **`LineCell`**: доминантный цвет ячейки (по частоте среди items)
- **`tableRegionToXml()`**: `<w:rPr><w:color w:val="..."/></w:rPr>` в ячейках таблиц
- **Отсканированные страницы**: если на странице <3 строк текста, рендерим страницу через `renderPageToPng()` → PNG → `<w:drawing>` (inline-изображение) с правильными размерами EMU. Изображения укладываются в `word/media/` + релсы в `document.xml.rels`
- **`document.xml`**: добавлены namespaces `a:`, `pic:` для DrawingML
- **`[Content_Types].xml`**: `<Default Extension="png" .../>`
- **Тесты**: `fillColorToHex`, `dominantString`, `ocrRenderScale` — 12 новых, всего 68/68
- tsc 0 · vitest 68/68 · build OK

## 2026-06-17 — Feature #6 (OCR improvements): адаптивный масштаб + мультиязычный UI

### Зачем
OCR работал с фиксированным `scale=2` — мелкий текст мог не распознаваться, а большие страницы обрабатывались избыточно долго. Выбор языка был ограничен одним выпадающим списком из 8 языков.

### Что сделано
- **`ocrRenderScale()`** (`pdf-utils.ts`): адаптивный масштаб — `targetLongSide / max(w,h)`, clamped в `[0.5, 3]`. Для A4 (~612×792) scale ≈ 2.27, для A0 — ≈ 0.74. Убрана жёсткая константа `scale = 2`.
- **Мультиязычный UI** (`tool-page.tsx`): `ocrLanguage` → `ocrLanguages` (массив), `toggleOcrLanguage()`, список из 16 языков (добавлены ukr, pol, nld, tur, ces, chi_sim, jpn, kor). Чекбоксы (grid 2 cols) вместо `<Select>`. В `ocrPdf` передаётся `ocrLanguages.join("+")`.
- **Импорт Checkbox** добавлен.

### Проверка
- `npx tsc --noEmit` → 0 ошибок
- `npx vitest run` → 56/56 passed
- `npm run build` → OK

---

## 2026-06-12 — Feature #2 (Phase B): Детекция таблиц → Word `w:tbl`

### Зачем
Продолжение #2. После Phase A (типографика/выравнивание) табличные данные в `pdf-to-word` всё ещё шли плоским текстом с пробелами. Phase B превращает выровненные колонки в настоящие таблицы Word.

### Что сделано (`pdf-utils.ts`, browser-only, без новых пакетов)
- **`detectTableRegions(cellsPerLine, tolerance)`** — новый чистый экспортируемый детектор. Консервативно: таблица = ≥2 **подряд идущих** строк, каждая с ≥2 ячейками, дающих ≥2 кластеризованных колонки (`clusterColumns`). Нетабличная строка (одна ячейка) разрывает регион. Читает только `x` и число ячеек — легко тестируется.
- **`pdfToWord`**: для каждой страницы строит `cellsPerLine = lines.map(cellsWithX)`, находит регионы, эмитит их через **`tableRegionToXml`** как `<w:tbl>` с границами (`tblBorders`), `tblGrid` и `tr/tc` (ячейки раскладываются по общим колонкам через `assignToColumn`). Остальные строки идут прежним путём Phase A (`lineToParagraphXml`). После таблицы вставляется `<w:p/>` (требование Word).
- **`pdfToExcel`** не трогался — он уже выравнивал колонки в Phase A.

### Защиты от ложных таблиц
- Требуется ≥2 строки И ≥2 колонки И смежность строк — проза (одноколоночные строки) и одиночные «таблицы» не срабатывают (покрыто тестами).

### Проверка
- `npx tsc --noEmit` → 0 ошибок
- **vitest 56/56** (+4 теста на `detectTableRegions`: таблица / проза / одна строка / разрыв)
- `npx vite build` → успешно
- ⚠️ Визуальная проверка таблиц на реальных PDF (границы, разбиение по колонкам) — ручной шаг
- Phase C (картинки, цвет текста) — следующая сессия

---

## 2026-06-12 — Feature #2 (Phase A): Fidelity pdf-to-word / pdf-to-excel

### Зачем
Roadmap-пункт #2 «переплюнуть iLovePDF» — главный платный фичар конкурента. До этого `pdfToWord` выдавал плоский однородный 11pt-текст (без размеров шрифта, жирного/курсива, выравнивания, таблиц), а `pdfToExcel` резал каждую строку на ячейки независимо → колонки не выравнивались между строками. Фаза A закрывает типографику и выравнивание (без таблиц/картинок — это фазы B/C).

### Что сделано (`pdf-utils.ts`, browser-only, без новых пакетов)
- **`extractPdfLayout` обогащён** (общий для word/excel/text/html/markdown — изменения аддитивны):
  - `PdfLayoutItem` += `fontSize` (из `Math.hypot(transform[2], transform[3])`), `bold`/`italic` (`detectFontStyle` по имени шрифта + `content.styles[fontName].fontFamily`).
  - `PdfLayoutPage` += `width`/`height` (scale-1 viewport, в точках) для выравнивания.
  - `PdfLayoutLine` += `fontSize` (доминирующий), `bold` (>60% символов), `alignment` (`lineAlignment` по полям bbox vs ширина страницы).
- **`pdfToWord` переписан**: размер шрифта → `w:sz` (полупункты), заголовки (строки ≥1.3× медианного размера → bold), runs сгруппированы по стилю (`itemsToStyledRuns`: bold/italic/size, с сохранением межколоночных пробелов), выравнивание абзаца → `w:jc`.
- **`pdfToExcel` переписан**: x-границы ячеек по всей странице кластеризуются в общие колонки (`clusterColumns`), каждая ячейка раскладывается в ближайшую колонку (`assignToColumn`) → таблицы выравниваются между строками; проза остаётся одной колонкой.
- **DRY**: `cellsFromLine` переведена на делегирование к новой `cellsWithX` (общая gap-эвристика, без дублирования). *Примечание: `cellsFromLine` теперь без активных вызовов — оставлена (не удаляю функции без подтверждения владельца), кандидат на удаление.*
- Новые чистые экспортируемые хелперы: `detectFontStyle`, `lineAlignment`, `clusterColumns`, `assignToColumn` (+ тип `PdfTextAlignment`, `StyledRun`).

### Проверка
- `npx tsc --noEmit` → 0 ошибок
- **vitest 52/52** (было 39, +13 юнит-тестов на новые хелперы)
- `npx vite build` → успешно
- ⚠️ Визуальная проверка качества Word/Excel на реальных документах (заголовки/выравнивание/колонки) — ручной шаг
- Фазы B (детекция таблиц → `w:tbl`) и C (картинки) — отложены на следующие сессии

---

## 2026-06-12 — Feature #3: Workflow-цепочки (vs iLovePDF)

### Зачем
Roadmap-пункт #3 «переплюнуть iLovePDF». Уникальная фича удержания: связать несколько PDF-операций в один проход (например merge → compress → watermark) без повторной загрузки/скачивания между шагами. У iLovePDF цепочки есть только в платном Desktop; PDFX делает это 100% в браузере.

### Что сделано (всё browser-only, без новых пакетов)
- **`client/src/lib/workflow-engine.ts`** (новый) — движок цепочек:
  - Реестр `WORKFLOW_STEPS` из 14 сцепляемых PDF→PDF шагов: compress, watermark, page-numbers, rotate, header-footer, grayscale, scanner, invert, remove-blank, remove-images, flatten, sanitize, repair, protect. Каждый шаг — типизированные опции (`select`/`text`/`password`/`range`) с дефолтами + `run(file, opts)`, оборачивающий существующую функцию `pdf-utils` (логика не дублируется).
  - `bytesToFile()` адаптер: выход шага (`Uint8Array`) → `File` на вход следующего.
  - `runWorkflow(files, items, onProgress)`: при >1 файле неявно делает `mergePdfs` первым шагом, затем последовательно прогоняет пайплайн, отдавая статус каждого шага (`pending`/`running`/`done`/`error`); бросает при первой ошибке шага с её сообщением.
  - 4 готовых пресета (`WORKFLOW_PRESETS`): send-ready, print-ready, scan-cleanup, anonymize.
- **`client/src/pages/workflow-page.tsx`** (новый) — конструктор цепочки: `FileUpload` (multiple), палитра «добавить шаг», упорядоченный список пайплайна с up/down/remove + инлайн-опции, пресеты в один клик, кнопка Run с прогрессом по шагам, метрика размера (вход→выход, −%) и скачивание результата. EN+RU инлайн, `useSeo`, только существующая палитра/классы.
- **Маршрут** `/workflow` (lazy) в `App.tsx` + `route-preload.ts` (`loadWorkflowPage`, добавлен в `warmPrimaryRoutes`).
- **Точка входа**: ссылка «Workflow/Цепочки» в `navbar.tsx` (desktop + mobile).
- ADR-011 добавлен в `.ai/decisions.md`.

### Проверка
- `npx tsc --noEmit` → 0 ошибок
- `npx vite build` → успешно (`workflow-page` — отдельный lazy-чанк 20.35 kB / gzip 6.70 kB)
- **E2E** `tests/e2e/workflow.spec.ts` (Playwright): рендер конструктора + добавление шагов в пайплайн из палитры + Run заблокирован без файла — 2/2 на chromium-desktop и mobile-chrome (4/4). Добавлены `data-testid`: `workflow-pipeline`, `workflow-run`, `workflow-add-{id}`.
- ⚠️ Полный прогон цепочки с реальным PDF (merge→compress→watermark, проверка выходного файла) — остаётся ручным шагом

---

## 2026-06-12 — Feature: реальное сжатие в Compress PDF (vs iLovePDF)

### Зачем
До этого `compressPdf` делал только структурную оптимизацию pdf-lib (object streams) — картинки не трогались, поэтому на фото/сканах выигрыш был почти нулевой. iLovePDF на тех же файлах даёт −60…80% за счёт пережатия изображений. Это закрывает главный разрыв в ежедневном инструменте.

### Что сделано (`pdf-utils.ts`, всё browser-only, без новых пакетов)
- **Smart-режим (level low/medium)** — `recompressEmbeddedImages()`: проходит по всем image-XObject'ам через `context.enumerateIndirectObjects()`, находит одиночные JPEG (`/Filter /DCTDecode`), декодирует через `createImageBitmap`, даунсемплит до maxDim по длинной стороне и пережимает с пониженным quality, заменяет поток через `PDFRawStream.of` + `context.assign`. **Текст и вектор не трогаются.** Параметры: low = 2200px/0.82, medium = 1600px/0.62.
- **Rasterize-режим (level high)** — `rasterizeToCompressedPdf()`: каждая страница рендерится pdfjs в canvas (scale 1.5, кламп площади 25МП) → JPEG q0.6 → новый PDF (картинка на лист в размере страницы в точках). Максимальное сжатие на любом PDF; текст становится картинкой. При ошибке — структурный фолбэк.
- **Защиты от регрессий**: пропуск картинок <8КБ; пропуск с `/SMask /Mask /ImageMask /Decode` (прозрачность/кастомный decode); `jpegComponentCount()` парсит SOF-маркер и пропускает CMYK (4 компонента) — иначе Adobe-CMYK инвертируется браузером; замена только если результат реально меньше; общий guard «не больше оригинала».

### Проверка
- `npx tsc --noEmit` → 0 ошибок
- `npx vite build` → успешно
- ⚠️ Интерактивный тест в браузере на фото-тяжёлом PDF — остаётся ручным шагом

---

## 2026-06-11 — Bugfix round: HIGH+MED+ALL priorities

### HIGH (user-confirmed, fixed)
- **sanitizePdf**: Added JS/tracking removal — deletes /OpenAction, /AA, /URI from catalog, removes Names.JavaScript and Names.EmbeddedFiles, removes per-page /AA and /JS actions; also clears creation/modification dates (epoch 0)
- **autoRedactPdf**: Fixed split-PII bug — sliding window groups 1–3 adjacent text items so SSNs/IBANs/phones torn across pdfjs text items are now caught; improved regex patterns: SSN allows spaces/no-separator (\d{3}[-\s]?\d{2}[-\s]?\d{4}), IBAN is now case-insensitive; fixed pdfjs srcDoc memory leak (try/finally destroy)
- **splitByChapters**: Fixed pdfjs viewDoc memory leak (try/finally destroy)

### MED
- **convertToPdfA**: Removed dead code — registerFontkit + empty getSize() loop (no functional change)
- **pdfDiff**: Fixed doc1/doc2 pdfjs memory leaks (try/finally destroy)
- **pdfjs memory leaks**: Added try/finally + .destroy() in 10 functions: invertColors, scannerEffect, cropPdf, comparePdf, removeBlankPages, grayscalePdf, pdfBookmarks, nUpPdf, overlayPdf, pdfToMarkdown

### tool-page.tsx
- **split-by-chapters download**: Fixed — checks magic bytes (0x50 0x4B) to distinguish PDF vs ZIP; single-chapter result now downloads as .pdf instead of .zip

---

## [2026-06-07] — Фикс: пробел в инлайн-редакторе текста (edit-pdf)

### Исправлен баг
- **`measureEditorTextWidth`** (`edit-pdf-utils.ts`) — инлайн-`<textarea>` авто-подгоняет ширину под измеренный текст и скрывает overflow. Измерение через canvas `measureText`, который отбрасывает хвостовые пробелы из advance-width → набранный в конце строки пробел не расширял поле, каретка/пробел обрезались краем (симптом «пробел не сдвигает шрифт»). Хвостовой ран пробелов/табов теперь добавляется к ширине явно.

---

## [2026-06-07] — Топ-10 популярных, плавность UI и аудит функций на баги

### Добавлено (UX)
- **Секция «Популярные инструменты»** на главной (`home.tsx`) — топ-10 самых востребованных инструментов в первых рядах (при категории «Все»), с порядковыми бейджами. Курируемый список `POPULAR_TOOL_SLUGS` + `getPopularTools()` в `tools.ts` (без новых пакетов, палитра не тронута).

### Производительность / плавность
- `ToolCard` обёрнут в `React.memo` — карточки не перерисовываются при смене категории и догрузке lazy-render (ссылки на `tool` стабильны).
- Каталожная сетка: убран `layout`-проп (источник layout-thrashing при фильтрации), появление ускорено (0.24→0.2s, stagger 12→8 элементов, `easeOut`).

### Исправлены баги (аудит 6 параллельными агентами + ручная верификация)
- **`extractPdfLayout`** — `loadingTask` не уничтожался → утечка pdfjs-документа и worker-порта на каждом вызове `pdfToWord/Excel/Text/Html/Markdown`. Обёрнуто в `try/finally` + `destroy()`.
- **`pdfDiff`** — страницы, существующие только во втором файле, молча терялись (цикл обращался к `getPages()[i]` за пределами `dstDoc`, загруженного из file1). Теперь лишние страницы копируются из file2 и помечаются. Маркер изменений перенесён с нижней кромки наверх страницы.
- **`pdf-metadata`** (`tool-page.tsx`) — при смене файла кэш `metadataLoaded/metadataFields` не сбрасывался → в новый файл записывались метаданные предыдущего. Сброс добавлен в `handleFiles/removeFile/reset`.
- **`split-pdf`** диапазон — магическое `end = 999` (обрезка документов >999 стр.) заменено реальным числом страниц (`getPdfPageCount`); устранён риск огромной аллокации в `splitPdf`.
- **`addWatermark`** (center) — центрирование считалось по грубой оценке `text.length*fontSize/4`; теперь по фактической `textWidth`.
- **`cropPdf`** (ручной режим) — CropBox игнорировал origin MediaBox (смещение на PDF с ненулевым origin) и не защищал от отрицательных размеров. Добавлены `getMediaBox()`-offset и guard.
- **`splitByChapters`** — outline считался отсортированным; добавлена сортировка глав по странице (иначе диапазоны рвутся/главы теряются).
- **`formatBytes`** — overflow >GB давал `"X undefined"`, отрицательные/дробные — `NaN`; добавлены TB/PB и clamp индекса.
- **`pdfImagesAsZip`** — битый `dataUrl` ронял JSZip; добавлен guard.
- **`signPdf`** — добавлен guard на PDF без страниц.

### Проверки
- `npx tsc --noEmit` → 0; `vitest` → 39/39; `npm run build` → успех; `playwright` → 43 passed, 3 skipped (без регрессий).

### Отклонено как ложные/не-баги (зафиксировано осознанно)
- `deletePages` off-by-one (вызывающий передаёт 0-based через `parsePageSelection`), `addPageNumbers` «X of Y» (консистентно: последняя страница = X/X), `overlayPdf` `document.createElement` (инструмент не в воркере — DOM доступен), open-range `"7-"` (не поддерживаемый формат в этом UI), `splitBySize` over-count (качество дробления, не баг), `autoRedact` для текста, разорванного между item'ами (известное ограничение pdfjs).

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
