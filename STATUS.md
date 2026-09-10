# PDFX — Status

> Snapshot: 2026-09-10. Обновлять после каждого значимого релиза/дельты.

## Состояние

- **main**: PR #2 смержен — фазы D/E конвертеров (w:tbl, w:color, rFonts, spacing, гиперссылки, числовые ячейки Excel, hasImages-guard, мультиколоночный reading order + table-cut guard), горячие клавиши (Shift+/ help), 183 vitest-теста.
- **Цель проекта**: 58 browser-only PDF-инструментов, ни один файл не покидает устройство; тяжёлые операции — Web Worker + main-thread fallback.

## Сделано в последней дельте

- **Phase F** (pdf-to-word): буллеты/нумерованные списки → настоящие `w:numPr` + `word/numbering.xml` (перезапуск нумерации на каждую ordered-группу); повторяющиеся колонтитулы (пояса 12%/86%, ≥60% страниц, минимум 3) вырезаются до конвертации.
- **Table-cut guard ≥3 ячеек** (ADR-018 уточнён): выровненные 2-колоночные статьи режутся в reading order; компромисс — 2-колоночная borderless-таблица неотличима от текста.
- **Воркер**: `pdfToWord`/`pdfToExcel` работают в Web Worker (hybrid в registry, e2e без fallback-warnings); **OCR** — в воркере только при подтверждённых nested workers (`probeNestedWorkers`, кэшируемый Blob-probe).
- **Mammoth golden** для docx: h1/h2, `<td><p>…</p></td>`, ссылки, `<ul>/<ol>` списки.
- **Premium-каркас** (ADR-019): env-гейты (ocr / >50 МБ / >5 файлов), offline Ed25519-лицензии `PDFX-<base64url(sig)>` над `pdfx-pro-v1`, `/pricing` панель активации, `npm run license:generate`.
- **Cloud import каркас** (roadmap #5): Google Drive (GIS + Picker) и Dropbox (Chooser) с чистыми мапперами; кнопки в дропзоне только при заданных env-ключах.
- Проверка: vitest 222/222 · tsc 0 · eslint 0 · build OK · license roundtrip OK.

## Осталось (next)

1. **Биллинг-выбор**: как выдаются ключи (Stripe/Paddle/ручная рассылка из `license:generate`); до включения боевых гейтов в проде нужен `VITE_PREMIUM_PUBLIC_KEY` и политика выдачи.
2. **Боевые ключи**: `VITE_PREMIUM_PUBLIC_KEY` (premium) и `VITE_GOOGLE_CLIENT_ID`/`VITE_GOOGLE_PICKER_KEY`/`VITE_DROPBOX_APP_KEY` (cloud import) + ручная проверка OAuth-потоков в браузере.
3. **QA-корпус**: собрать реальные PDF (таблицы, колонки, колонтитулы, сканы, кириллица/RTL) и прогнать визуальную валидацию docx/xlsx в Word/LibreOffice — текущие golden фиксируют нашу же генерацию.
4. **e2e прогон** новых worker-спек (pdf-to-word/pdf-to-excel) в CI на реальном браузере; при желании — такой же probe-gated e2e для ocr-pdf.
