/**
 * Пути к ресурсам pdfjs-dist (standard_fonts), которые нужны `getDocument`.
 *
 * Без `standardFontDataUrl` pdfjs не может загрузить стандартные 14 шрифтов
 * (Helvetica/Times/Courier и их варианты) и на каждый такой PDF печатает
 * `Ensure that the 'standardFontDataUrl' API parameter is provided.`
 * (см. BaseStandardFontDataFactory в pdfjs-dist/build/pdf.mjs).
 *
 * В браузере файлы раздаёт Vite-плагин `pdfjsAssets` (dev-middleware + emit
 * при сборке) по пути `/assets/pdfjs/standard_fonts/`.
 * В Node (vitest, SSR) pdfjs-dist читает их через `fs.readFile`, поэтому нужен
 * реальный путь на диске — он выводится из `import.meta.url` этого модуля.
 */

/** Базовый URL стандартных шрифтов в браузере (см. vite.config.ts). */
export const BROWSER_STANDARD_FONT_DATA_URL = '/pdfjs/standard_fonts/';

const NODE_STANDARD_FONT_DATA_PATH = '../../../node_modules/pdfjs-dist/standard_fonts/';

function isNodeRuntime(): boolean {
  return (
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    !!process.versions?.node
  );
}

/**
 * `standardFontDataUrl` для `getDocument` — с корректным окончанием `/`,
 * которое pdfjs конкатенирует с именем файла шрифта.
 */
export function standardFontDataUrl(): string {
  if (isNodeRuntime()) {
    return new URL(NODE_STANDARD_FONT_DATA_PATH, import.meta.url).pathname;
  }
  return BROWSER_STANDARD_FONT_DATA_URL;
}
