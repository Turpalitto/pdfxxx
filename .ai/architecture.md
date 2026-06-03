# PDFX — Architecture

> Source of truth. Last updated: 2026-05-30. Update after structural changes.

---

## Структура директорий

```
client/src/
├── App.tsx                    # Router (wouter) — все маршруты
├── main.tsx                   # Entry point, провайдеры
├── index.css                  # CSS-переменные, глобальные стили
│
├── lib/                       # Ядро бизнес-логики
│   ├── tools.ts               # ← РЕЕСТР ИНСТРУМЕНТОВ (source of truth)
│   ├── pdf-utils.ts           # ← ВСЕ PDF-функции (~2324 строки)
│   ├── tool-translations.ts   # Переводы инструментов (18 языков, ~664 строки)
│   ├── tool-experience.ts     # Sidebar: workflow suggestions per tool
│   ├── upload-limits.ts       # Лимиты размера файла per tool
│   ├── i18n.ts                # UI-строки (не названия инструментов)
│   ├── lang-context.tsx       # React Context для языка
│   ├── theme.tsx              # Dark/sepia/light theme
│   └── utils.ts               # Хелперы: cn(), clamp()
│
├── pages/
│   ├── home.tsx               # Главная: сетка инструментов + поиск
│   ├── tool-page.tsx          # ← УНИВЕРСАЛЬНАЯ СТРАНИЦА (~1876 строк)
│   ├── edit-pdf-page.tsx      # ← РЕДАКТОР Fabric.js (~3506 строк, автономный)
│   ├── pricing.tsx
│   ├── contact.tsx
│   ├── privacy.tsx
│   ├── terms.tsx
│   └── not-found.tsx
│
└── components/
    ├── navbar.tsx
    ├── footer.tsx
    ├── file-upload.tsx        # Drag-and-drop загрузчик
    ├── tool-card.tsx          # Карточка инструмента в сетке
    ├── page-thumbnails.tsx    # Превью страниц PDF (delete/reorder/extract)
    ├── page-selector.tsx      # Ввод диапазона страниц
    ├── progress-ring.tsx      # Анимированный индикатор прогресса
    ├── animated-background.tsx
    └── ui/                    # shadcn/ui компоненты (не трогать)
```

---

## Поток данных (типичный инструмент)

```
Пользователь загружает файл
        ↓
FileUpload component
        ↓
files[] state в tool-page.tsx
        ↓
handleProcess() → switch(slug) → pdf-utils функция
        ↓         [всё в main thread браузера]
result = Uint8Array
        ↓
handleDownload() → downloadBlob() / downloadText()
        ↓
Браузер скачивает файл
```

---

## Поток данных — Edit PDF (особый случай)

```
Файл → edit-pdf-page.tsx
     → pdfjs-dist: рендер каждой страницы на <canvas>
     → extractTextLines(): кэш текстовых строк → pageTextLinesRef
     → Fabric.js: интерактивный слой поверх canvas
     → per-page JSON state → pageStatesRef
     → handleSave(): pdf-lib встраивает Fabric-объекты как изображения
     → downloadBlob()
```

---

## Ключевые модули

### `tools.ts` — Реестр инструментов

Каждый инструмент:
```typescript
{
  slug: string          // URL: /tools/{slug}
  name: string          // Отображаемое имя (EN)
  description: string
  icon: LucideIcon
  emoji: string
  category: "organize" | "convert-from" | "convert-to" | "security" | "utility" | "ocr" | "optimize"
  color: "blue"|"violet"|"green"|"orange"|"teal"|"indigo"|"amber"|"rose"|"sky"|"slate"
  accept: string        // MIME/расширения для file picker
  outputExt: string     // Расширение выходного файла
}
```

`categoryColors` — маппинг color → CSS классы. **Не добавлять новые цвета.**

### `pdf-utils.ts` — PDF движок

Все функции async, принимают `File`, возвращают `Uint8Array` или специфические типы.

**Паттерн pdfjs (обязательный):**
```typescript
const pdfjs = await loadPdfJs();  // кэшируется после первого вызова
const doc = await pdfjs.getDocument({ data: bytes }).promise;
```

**Критично:** `embedPages()` → `PDFEmbeddedPage[]` → `drawPage()` ✅  
`copyPages()` → `PDFPage[]` → `addPage()` ✅  
Смешивать нельзя!

### `tool-page.tsx` — Универсальный обработчик

Обрабатывает **все инструменты кроме** `edit-pdf`.

Секции:
1. **State**: файлы, прогресс, результат, опции каждого инструмента
2. **`handleProcess()`**: switch(slug) вызывает pdf-utils
3. **`handleDownload()`**: роутит в правильный формат скачивания
4. **JSX**: upload + controls + progress + result + sidebar

**Точки вставки для новых инструментов:**
- State vars: после блока `resizeFit`
- Switch case: перед `case "compare-pdf":`
- Download handler: перед split-pdf handler
- JSX controls: перед `{/* COMPRESS result metric */}`

### `edit-pdf-page.tsx` — Canvas редактор

**Автономный** — не использует `tool-page.tsx`.

Ключевые refs:
```typescript
fabricRef          // Fabric.js Canvas instance
pdfCanvasRef       // <canvas> для pdfjs рендера
fabricElRef        // <canvas> для Fabric.js
pageStatesRef      // Map<pageNum, fabricJSON>
pageTextLinesRef   // Map<pageNum, TextLineMetric[]>
pageOrigBytesRef   // Uint8Array исходного PDF
```

Find & Replace (Ctrl+F):
```typescript
findInPage()           // Ищет в pageTextLinesRef, рисует rect-хайлайты
navigateFindMatch()    // Навигация по совпадениям
replaceCurrentMatch()  // Белый rect-маска + Fabric Textbox
replaceAllMatches()    // Batch замена всех
clearFindHighlights()  // Удаляет временные rect-объекты
```

---

## Маршруты (App.tsx)

```
/                        → home.tsx
/tools/:slug             → tool-page.tsx (все инструменты)
/tools/edit-pdf          → edit-pdf-page.tsx (особый случай)
/pricing                 → pricing.tsx
/contact                 → contact.tsx
/privacy                 → privacy.tsx
/terms                   → terms.tsx
*                        → not-found.tsx
```

---

## Языковая система

```typescript
// UI строки
const { lang, t } = useLang();  // t.someKey

// Названия инструментов
getToolTranslation(slug, lang)  // из tool-translations.ts
```

Язык хранится в `localStorage`. Поддержано 18 языков:
`en, ru, es, fr, de, zh, pt, it, uk, pl, ja, ko, ar, tr, vi, id, th, cs`

**Активные для разработки: только EN и RU.**

---

## Дизайн-система

CSS-переменные в `index.css`:
```css
--background        /* фон страницы */
--foreground        /* текст */
--pdfx-panel        /* фон панелей */
--pdfx-panel-border /* границы панелей */
--pdfx-editor-toolbar /* тулбар редактора */
--pdfx-editor-bg    /* фон рабочей области редактора */
```

**Три темы:** dark (default), light, sepia.  
**Не менять** — это жёсткое правило.

---

## Зависимости между компонентами

```
home.tsx
  └── tool-card.tsx
       └── tools.ts (реестр)

tool-page.tsx
  ├── file-upload.tsx
  ├── page-thumbnails.tsx (для delete/reorder/extract)
  ├── page-selector.tsx
  ├── progress-ring.tsx
  ├── pdf-utils.ts (ВСЕ PDF операции)
  ├── tools.ts (getToolBySlug)
  ├── tool-translations.ts
  ├── tool-experience.ts
  └── upload-limits.ts

edit-pdf-page.tsx
  ├── fabric (динамический import)
  ├── pdfjs-dist (динамический import через loadPdfJs())
  ├── pdf-lib (PDFDocument)
  └── shadcn/ui компоненты
```

---

## Технический долг (известный)

| Проблема | Серьёзность | Описание |
|---|---|---|
| Main thread blocking | Средняя | PDF обрабатывается в main thread. Тяжёлые операции (OCR, grayscale больших файлов) подвешивают UI. Решение: Web Workers |
| edit-pdf-page.tsx размер | Средняя | 3506 строк — нужна декомпозиция на хуки и подкомпоненты |
| tool-page.tsx размер | Низкая | 1876 строк — switch-case монолит, можно разбить на стратегии |
| Drizzle/Passport мёртвый код | Низкая | Backend зависимости подключены, но не используются для PDF |
| Нет Web Workers | Средняя | Все PDF операции блокируют UI thread |
| Нет unit tests для pdf-utils | Средняя | Логика без покрытия тестами |
| compare-pdf input[type=file] | Низкая | Всегда видимый input триггерит Playwright file chooser |
