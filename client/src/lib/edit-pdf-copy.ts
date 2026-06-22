export function getEditPdfSeoCopy(isRu: boolean) {
  return {
    title: isRu ? "Редактировать PDF — PDFX" : "Edit PDF — PDFX",
    description: isRu
      ? "Добавляйте текст, рисунки, изображения и подписи к PDF прямо в браузере. Файл не покидает ваш компьютер."
      : "Add text, drawings, images and signatures to PDF directly in the browser. No upload to server.",
  };
}

export function getEditPdfCopy(isRu: boolean, maxFileSizeMb: number) {
  return {
    title: isRu ? "Редактировать PDF" : "Edit PDF",
    upload: isRu ? "Перетащите PDF сюда или" : "Drop PDF here or",
    choose: isRu ? "Выберите файл" : "Choose file",
    limit: isRu ? `Макс. ${maxFileSizeMb} МБ` : `Max ${maxFileSizeMb} MB`,
    save: isRu ? "Скачать PDF" : "Download PDF",
    saving: isRu ? "Сохранение…" : "Saving…",
    undo: isRu ? "Отменить" : "Undo",
    redo: isRu ? "Повторить" : "Redo",
    tools: {
      select: isRu ? "Выбор" : "Select",
      text: isRu ? "Текст" : "Text",
      editText: isRu ? "Редактировать текст" : "Edit text",
      draw: isRu ? "Рисование" : "Draw",
      image: isRu ? "Изображение" : "Image",
      sign: isRu ? "Подпись" : "Signature",
      rect: isRu ? "Прямоугольник" : "Rectangle",
      circle: isRu ? "Круг" : "Circle",
      line: isRu ? "Линия" : "Line",
      highlight: isRu ? "Маркер" : "Highlight",
      eraser: isRu ? "Ластик" : "Eraser",
    },
    page: isRu ? "стр." : "p.",
    howToUse: isRu ? "Как использовать" : "How to use",
    steps: isRu
      ? [
          "Загрузите PDF файл",
          "Выберите инструмент в тулбаре",
          "Редактируйте страницы",
          "Нажмите «Скачать PDF»",
        ]
      : [
          "Upload your PDF file",
          "Select a tool from the toolbar",
          "Edit pages as needed",
          "Click «Download PDF»",
        ],
    signTitle: isRu ? "Нарисуйте подпись" : "Draw your signature",
    signClear: isRu ? "Очистить" : "Clear",
    signConfirm: isRu ? "Добавить" : "Add",
    eraseHint: isRu ? "Кликните на объект чтобы удалить" : "Click an object to delete it",
  };
}
