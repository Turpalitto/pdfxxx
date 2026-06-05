# PDFX — Tasks & Technical Debt

> Обновляется AI-агентами после каждой значимой задачи.  
> Last updated: 2026-06-05

---

## 🔄 Текущие задачи (In Progress)

- [ ] TD-02 Phase 5: Дальнейшая декомпозиция edit-pdf-page.tsx (~2291 строк) — выигрыш мал (каждый хук 10+ параметров)

## ✅ Решено

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
