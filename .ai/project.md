# PDFX — Project Overview

> Source of truth. Last updated: 2026-06-21. Update after major changes.

---

## Описание

**PDFX** — бесплатный браузерный PDF-инструментарий. Все операции выполняются **прямо в браузере пользователя** без отправки файлов на сервер. Это ключевое конкурентное преимущество: приватность, скорость, офлайн-работа.

Вдохновлён [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF), но в отличие от него — полностью frontend.

---

## Цели проекта

- Предоставить пользователям максимум PDF-операций без регистрации и загрузки файлов на сервер
- Конкурировать с ilovepdf.com, smallpdf.com, pdf24.org за счёт приватности
- Поддерживать 18 языков интерфейса
- Обеспечить premium-дизайн и быстрый UX

---

## Текущее состояние (2026-06-21)

| Параметр | Значение |
|---|---|
| Инструментов | **58 активных** |
| Категорий | 7 (organize, convert-from, convert-to, security, utility, ocr, optimize) |
| Языков | 18 (активные для разработки: EN + RU) |
| TypeScript | ✅ 0 ошибок |
| Тесты | Vitest 93 unit-теста + Playwright E2E baseline 51 passed / 3 skipped |
| CI/CD | GitHub Actions настроен ранее; текущий раунд добавляет локальные проверки |
| База данных | Drizzle ORM + PostgreSQL (подключена, но не используется для PDF) |

---

## Ключевые функции

### Конвертация
- PDF → Word, JPG, PNG, Text, HTML, Excel
- Word, Images, Excel, Text → PDF

### Редактирование
- Полный canvas-редактор (Fabric.js): текст, рисование, фигуры, подпись, хайлайт
- **Find & Replace** (Ctrl+F) с regex-подсветкой прямо в редакторе

### Организация
- Merge, Split, Rotate, Delete/Reorder Pages, Extract Pages
- Crop (обрезка полей), N-up (несколько страниц на лист), Resize Pages
- Split by Size (разбивка по размеру файла), Compare PDF, Remove Blank Pages

### Безопасность
- Protect/Unlock (AES-256), Sign PDF, Redact, **Auto-Redact** (email/phone/SSN/regex)

### Обогащение
- Watermark, Page Numbers, Header/Footer, OCR (Tesseract.js, 8 языков)

### Утилиты
- Compress, Repair, **Flatten Forms**, Grayscale, **Overlay PDF**
- Metadata Editor, Bookmarks Export

---

## Технологический стек

### Frontend
| Технология | Версия | Зачем |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.x | Типизация |
| Vite | 5.x | Bundler + dev server |
| Tailwind CSS | 3.x | Стилизация |
| shadcn/ui | последняя | UI компоненты (Radix-based) |
| wouter | 3.x | Лёгкий роутер |
| framer-motion | 11.x | Анимации |

### PDF-движки (все в браузере)
| Библиотека | Зачем |
|---|---|
| `pdf-lib` | Создание, модификация, сохранение PDF |
| `pdfjs-dist` | Рендер страниц на canvas, извлечение текста |
| `fabric` v7 | Canvas-редактор страниц |
| `tesseract.js` | OCR в браузере |
| `jszip` | ZIP-архивы (batch export) |
| `mammoth` | DOCX → HTML → PDF |
| `xlsx` (SheetJS) | Excel ↔ PDF |
| `@pdf-lib/fontkit` | Кастомные шрифты в pdf-lib |

### Backend
| Технология | Роль |
|---|---|
| Express.js 5 | Только раздача статики + SPA fallback |
| Drizzle ORM | ORM (подключён, не активно используется) |
| PostgreSQL | БД (подключена, не активно используется) |
| Passport.js | Auth (подключён, не активно используется) |

> ⚠️ Backend НЕ обрабатывает PDF. Все библиотеки (pdf-lib и др.) работают только на клиенте.

---

## Команды разработчика

```bash
npm run dev          # Dev server на :5000 (hot reload)
npx tsc --noEmit     # TypeScript check — обязательно перед коммитом
npm run build        # Production build
```

---

## Файловая структура (верхний уровень)

```
c:\pdfxxx\
├── client/          # React SPA (весь frontend)
├── server/          # Express.js (только статика)
├── shared/          # Общие типы
├── .ai/             # Система памяти AI-агентов ← ТЫ ЗДЕСЬ
├── AGENTS.md        # Протокол для AI-агентов
├── AGENT.md         # Gemini-совместимый манифест
├── CLAUDE.md        # Claude-совместимый манифест
└── .cursor/         # Cursor IDE настройки
```

Подробнее — в `.ai/architecture.md`.
