<!--
  AUTO-READ: This file is the primary context document for AI agents.
  Read this ENTIRE file before making any code changes.
  Last updated: 2026-05-30
-->

# AGENTS.md — PDFX · AI Agent Protocol

> Этот файл — **главный источник истины** для всех AI-агентов, работающих с репозиторием PDFX.  
> Прочти его полностью перед любым изменением кода.

---

## ⚡ Обязательный протокол (выполнять всегда)

### Перед началом ЛЮБОЙ задачи прочитать:

```
AGENTS.md                  ← этот файл (протокол и правила)
.ai/project.md             ← что такое проект, цели, текущее состояние
.ai/architecture.md        ← структура кода, модули, потоки данных
.ai/decisions.md           ← принятые архитектурные решения (ADR)
```

Эти четыре файла — **источник истины**. Без их прочтения задачи не выполнять.

### После завершения ЗНАЧИМОЙ задачи автоматически обновить:

```
.ai/changelog.md           ← что было изменено
.ai/tasks.md               ← закрыть завершённые задачи, добавить новые
```

Если принято новое архитектурное решение — дополнительно:
```
.ai/decisions.md           ← добавить новый ADR
```

### НЕ делать без явного подтверждения пользователя:
- Удалять файлы или функции
- Рефакторить существующую архитектуру
- Менять цветовую палитру или дизайн-систему
- Добавлять новые npm-пакеты
- Менять структуру базы данных

---

## 🏗️ Краткая справка по проекту

| | |
|---|---|
| **Проект** | PDFX — браузерный PDF-инструментарий |
| **URL** | pdfx.tools |
| **Стек** | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| **Backend** | Express.js — только раздача статики, PDF НЕ обрабатывает |
| **Порт** | 5000 (`npm run dev`) |
| **Инструментов** | 43 PDF-инструмента |
| **Языки UI** | EN + RU (активные), ещё 16 языков (не трогать) |

---

## 🔴 Жёсткие запреты

1. **Не менять цветовую палитру** — CSS-переменные в `index.css`, `categoryColors` в `tools.ts`
2. **Не добавлять серверную обработку PDF** — всё работает в браузере
3. **TypeScript должен компилироваться** — `npx tsc --noEmit` → 0 ошибок обязательно
4. **Не дублировать slug инструментов** — проверять перед добавлением
5. **Не дублировать экспорты** в `pdf-utils.ts`
6. **Только EN + RU** для новых переводов — остальные языки не трогать
7. `edit-pdf-page.tsx` — автономный компонент, не использует `tool-page.tsx`

---

## 📁 Система памяти проекта

```
.ai/
├── project.md        — описание, цели, стек, статус
├── architecture.md   — модули, потоки данных, зависимости
├── decisions.md      — журнал ADR (архитектурных решений)
├── tasks.md          — текущие задачи, техдолг, идеи
├── changelog.md      — журнал изменений
└── prompts/
    ├── feature.md    — шаблон промпта для новой функции
    ├── bugfix.md     — шаблон промпта для исправления бага
    ├── refactor.md   — шаблон промпта для рефакторинга
    └── audit.md      — шаблон промпта для аудита кода
```

---

## 🛠️ Добавление нового инструмента — чеклист

```
[ ] 1. tools.ts          — добавить объект Tool (уникальный slug, существующий цвет)
[ ] 2. pdf-utils.ts      — добавить функцию (проверить дубли перед добавлением)
[ ] 3. tool-page.tsx     — state vars после блока resizeFit
[ ] 4. tool-page.tsx     — switch case в handleProcess() перед "compare-pdf"
[ ] 5. tool-page.tsx     — download handler (если ZIP) перед split-pdf handler
[ ] 6. tool-page.tsx     — JSX UI блок перед {/* COMPRESS result metric */}
[ ] 7. tool-translations.ts — EN перевод после pdf-bookmarks EN
[ ] 8. tool-translations.ts — RU перевод после pdf-bookmarks RU
[ ] 9. npx tsc --noEmit  — 0 ошибок
[ ] 10. Проверить в браузере: http://localhost:5000/tools/<slug>
[ ] 11. Обновить .ai/changelog.md и .ai/tasks.md
```

---

## 🔍 Ключевые паттерны

### pdfjs — всегда lazy load
```typescript
const pdfjs = await loadPdfJs();
const doc = await pdfjs.getDocument({ data: bytes }).promise;
```

### pdf-lib — embedPages vs copyPages
```
embedPages() → PDFEmbeddedPage[] → используй с drawPage()   ✅
copyPages()  → PDFPage[]        → используй с addPage()     ✅
НЕ СМЕШИВАТЬ — drawPage() требует PDFEmbeddedPage           ❌
```

### Координаты текста
```
pdfjs-dist: Y сверху вниз (screen coords)
pdf-lib:    Y снизу вверх (PDF coords)
Конвертация: pdfY = pageHeight - viewportY
```

---

*Подробная документация: `.ai/project.md`, `.ai/architecture.md`, `.ai/decisions.md`*
