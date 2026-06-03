# PDFX — Аудит функций (2026-06-03)

> Полный аудит на баги: 68 функций `pdf-utils.ts` + `tool-page.tsx` + редактор. 6 параллельных агентов.
> ✅ = верифицировано чтением кода вручную. Остальное — находки агентов с цитатами кода (высокая достоверность).

---

## 🔴 CRITICAL

### C1. Редакция небезопасна на ротированных страницах ✅
`pdf-utils.ts:844-846` (redactPdf), `~2410` (autoRedactPdf)
Холст рендерится из `page.getViewport()` (учитывает /Rotate → landscape для /Rotate 90), маски рисуются в координатах viewport верно. НО результирующая страница создаётся по `origPage.getSize()` (MediaBox без rotation, portrait), и landscape-картинка вжимается в portrait → **искажение + маски смещаются с текста → конфиденциальный текст может остаться видимым**.
Фикс: размер страницы = `viewport.width/renderScale × viewport.height/renderScale`, картинку рисовать в этот размер.
Тот же корень (getSize vs ротированный viewport) затрагивает invertColors/grayscalePdf/scannerEffect (искажение) и overlay редактора на ротированных страницах.

### C2. OOM на больших файлах — canvas не освобождаются, все страницы копятся
`pdf-utils.ts:1161-1173` (pdfToImages), `2792-2812` (pdfToPptx), `1466-1475` (ocrPdf)
Каждая страница рендерится в полноразмерный canvas (scale 2-4), canvas не обнуляется (`canvas.width=0`), `page.cleanup()` не вызывается, все dataURL копятся в массиве. pdfToImages→pdfImagesAsZip держит двойную копию. 200-500 стр. → краш вкладки. Scale не ограничен (canvas >268MP → toDataURL бросает).
Фикс: освобождать canvas + `page.cleanup()` каждую итерацию; стримить в zip по одной странице; клампить scale; для pptx — JPEG вместо PNG.

---

## 🟠 HIGH

### H1. flattenPdf не сводит формы — теряет данные ✅
`pdf-utils.ts:572-579` — `copyPages` не переносит AcroForm и не вызывает `form.flatten()`. Заполненные поля **исчезают** вместо впекания в контент.
Фикс: грузить src, `src.getForm().flatten()`, сохранять src.

### H2. fillPdfForm молча глотает ошибки ✅
`pdf-utils.ts:1759-1770` — `catch { /* skip */ }`. Не-ASCII значение (кириллица) + StandardFont → encoding error → проглочен → **поле остаётся пустым без ошибки**.
Фикс: для не-ASCII эмбедить Unicode-шрифт + `updateAppearances`; не глотать ошибку молча.

### H3. setPdfMetadata неполный
`pdf-utils.ts:2031-2042` — не обрабатывает `producer`, `creationDate`, `modDate`; pdf-lib при save перетирает Producer своей подписью. UI-изменения этих полей теряются.

### H4. Нет guard на пустой/невалидный ввод → краш save() или молчаливый пустой результат
`pdf-utils.ts` — mergePdfs([]), splitPdf (range вне диапазона/`5-3`), deletePages (все страницы), extractPages/reorderPages (невалидные индексы), rotatePdf (индекс вне диапазона `getPage(i)` бросает), bookletImposition/toSinglePage/nUpPdf (0 страниц → addPage([0,0]) или save «no pages»). Пользователь триггерит штатными действиями.
Фикс: валидировать индексы (`0<=i<count`), проверять `result.pageCount>0` перед save.

### H5. Юникод/эмодзи в StandardFont → краш операции
addWatermark, addHeaderFooter, signPdf, addPageNumbers, textToPdf — `drawText` со StandardFont (Helvetica) + кириллица/эмодзи → WinAnsi encoding error, нет try/catch (в отличие от ocrPdf). Есть `needsUnicode`→NotoSans, но эмодзи NotoSans не покрывает.
Фикс: try/catch вокруг drawText + санитизация символов вне cmap.

### H6. imagesToPdf игнорирует EXIF-ориентацию
`pdf-utils.ts:457-475` — `embedJpg` не читает EXIF Orientation. Фото с телефона (portrait, Orientation=6) → страница повёрнута на 90°, текст лёжа.
Фикс: растеризовать через `createImageBitmap(file,{imageOrientation:"from-image"})`.

### H7. pdfToText/Html/Docx — пустой результат для сканов без ошибки
`pdf-utils.ts:1126-1145` и др. — для PDF без текстового слоя возвращают строку из одних разделителей страниц. В отличие от pdfToWord/Excel (бросают «Try OCR»), эти молча отдают пустышку. Плюс pdfToText теряет переносы строк/колонки (join(" ") без учёта Y).

### H8. Редактор: потеря введённого текста при смене страницы
`edit-pdf-page.tsx:319-324` — `commitTextEditor` при `editor.pageNumber !== currentPage` делает `setActiveTextEditor(null)` и **выбрасывает текст**. onBlur textarea при переключении страницы срабатывает уже после смены `currentPage` → набранный текст теряется без сохранения в pageStates.

### H9. Редактор: гонки undo/redo через булев suppressHistoryRef
`use-editor-history.ts:36-67` — `suppressHistoryRef` булев, общий для loadCanvasState/draft-рисования/undo/redo. Два конкурентных `loadFromJSON` (двойной Ctrl+Z) → первый `.then` снимает подавление в середине второго → ложные записи в историю, обрезка redo-ветки, недетерминированное состояние.
Фикс: счётчик вложенности вместо булева; сериализовать undo/redo.

### H10. addBackground рисует фон ПОВЕРХ контента
`pdf-utils.ts:2686-2696` — `drawRectangle` добавляет операторы в конец stream → прямоугольник поверх текста, даже при opacity 0.15 тонирует/перекрывает контент вместо подложки.

---

## 🟡 MEDIUM (кратко)

- **parsePageSelection `5-1`** молча реверсит в `[5,4,3,2,1]` вместо ошибки (delete/extract сюрприз).
- **tool-page**: смена splitMode/параметра после «done» не сбрасывает результат → скачивается ZIP с расширением `.pdf` или наоборот.
- **simulateProgress** (setTimeout) конкурирует с реальным `setProgress` → прогресс прыгает назад; таймеры не очищаются.
- **compressPdf** часто возвращает файл = оригиналу (pdf-lib не жмёт изображения); на `level:low` гарантированно без эффекта.
- **pdfDiff**: `join("")` без пробелов (ложные срабатывания), маркер только полоска 20pt снизу, не помечает удалённые страницы (doc1>doc2).
- **excelToPdf**: ширина колонки = `Math.min(...длины)` вместо max → колонка с одной пустой ячейкой схлопывается, текст обрезается.
- **textToPdf**: длинное слово/URL/CJK без пробелов не переносится → уезжает за поле.
- **pdfToMarkdown**: склейка run'ов без пробелов (`HelloWorld`); заголовки по абсолютному fontSize/12 → весь док из 16pt = сплошные `#`.
- **pdfToAudio**: `getVoices()` пуст при первом вызове (нет подписки на voiceschanged); нет проверки голоса для lang, нет onerror, длинный текст обрывается.
- **Редактор F&R** устаревает при смене страницы (highlight-объекты уничтоженного канваса, координаты прошлой страницы); множественные замены в одной строке наезжают.
- **Редактор**: изображение/подпись добавляются в `fabricRef.current` через async onload → после смены страницы попадают не на ту страницу.
- **Редактор**: F&R-замена оставляет исходный текст в PDF-слое под прозрачным PNG (извлекается copy/paste) — для «замены текста» утечка содержимого.
- **tool-page**: общий стейт `pagesToExtract` между add-blank/extract/reorder переживает SPA-навигацию → `0` валиден для одного, невалиден для другого.
- **convertToPdfA / sanitizePdf / repairPdf** не делают заявленного (нет реального PDF/A с OutputIntent/XMP; не чистят XMP/JS/вложения; repair = round-trip, не чинит битый xref).
- **unlockPdf**: `removeProtection()` бросает `PermissionDeniedError` при user-пароле без modify-права — не перехвачено.
- **removeBlankPages / resizePages**: растеризация/getSize игнорируют /Rotate на ротированных страницах.

## 🟢 LOW (кратко)

- formatBytes → "NaN undefined" на отрицательном/NaN/≥1TB входе.
- split-by-chapters с 1 частью: сырой PDF скачивается как `.zip`.
- Дельта размера «-X%» для конвертеров (pdf→docx) бессмысленна (не сжатие).
- removeImages оставляет dangling `/Im Do` в content stream; не трогает Form XObject/inline.
- cropPdf: отрицательный CropBox при больших полях; игнор origin MediaBox.
- nUpPdf/splitBySize: NaN/0/отрицательный ввод → мусорный результат без ошибки.
- getPdfFormFields: OptionList/ListBox не обрабатывается.
- Двойной сабмит process() через хоткей (нет re-entrancy ref) — низкая вероятность.

---

## Не баги (проверено)
- switch-case в tool-page: все вызовы с правильными аргументами, нет пропущенных case, fall-through намеренные.
- Rules of Hooks: нарушений нет.
- Object URL: все createObjectURL парны с revoke.
- Сброс ошибки между запусками, валидация пустого файла/пароля — ок.
- Координаты Y при сохранении редактора (растр всего слоя) — корректны для /Rotate 0.

## Сводка
CRITICAL: 2 · HIGH: 10 · MEDIUM: ~16 · LOW: ~8. Самое опасное: **C1 (небезопасная редакция на ротации)** и **H1/H2 (тихая потеря данных форм)**.
