import type { LangCode } from "./i18n";

export type WorkflowCopy = { en: string; ru: string };

export type WorkflowPreset = {
  id: string;
  title: WorkflowCopy;
  description: WorkflowCopy;
  stepIds: string[];
};

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: "send-ready",
    title: { en: "Ready to send", ru: "Готов к отправке" },
    description: {
      en: "Compress, watermark, then protect with a password.",
      ru: "Сжать, поставить водяной знак и защитить паролем.",
    },
    stepIds: ["compress", "watermark", "protect"],
  },
  {
    id: "print-ready",
    title: { en: "Prepare for print", ru: "Подготовить к печати" },
    description: {
      en: "Add page numbers, header/footer, and compress.",
      ru: "Добавить нумерацию, колонтитулы и сжать.",
    },
    stepIds: ["page-numbers", "header-footer", "compress"],
  },
  {
    id: "scan-cleanup",
    title: { en: "Clean up a scan", ru: "Привести скан в порядок" },
    description: {
      en: "Remove blank pages, apply a scanner look, and compress.",
      ru: "Убрать пустые страницы, добавить эффект скана и сжать.",
    },
    stepIds: ["remove-blank", "scanner", "compress"],
  },
  {
    id: "anonymize",
    title: { en: "Anonymize", ru: "Анонимизировать" },
    description: {
      en: "Strip metadata, remove images, and compress.",
      ru: "Очистить метаданные, удалить картинки и сжать.",
    },
    stepIds: ["sanitize", "remove-images", "compress"],
  },
];

export function pickCopy(copy: WorkflowCopy, lang: LangCode): string {
  return lang === "ru" ? copy.ru : copy.en;
}
