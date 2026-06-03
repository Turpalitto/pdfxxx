import type { LangCode } from "./i18n";
import { getToolBySlug, isToolLaunchReady, type Tool } from "./tools";

const RECENT_TOOLS_STORAGE_KEY = "pdfx-recent-tools";
const MAX_RECENT_TOOLS = 6;

type Copy = {
  en: string;
  ru: string;
};

type WorkflowDefinition = {
  id: string;
  title: Copy;
  description: Copy;
  accentClass: string;
  toolSlugs: string[];
};

export type WorkflowPlaybook = {
  id: string;
  title: string;
  description: string;
  accentClass: string;
  tools: Tool[];
};

export type WorkflowSuggestion = WorkflowPlaybook & {
  nextTool: Tool;
  remainingTools: Tool[];
};

const workflowDefinitions: WorkflowDefinition[] = [
  {
    id: "contract-ready",
    title: {
      en: "Prepare a contract for sending",
      ru: "Подготовить договор к отправке",
    },
    description: {
      en: "Merge pages, add numbering, and protect the final PDF before sharing.",
      ru: "Объедините страницы, добавьте нумерацию и защитите итоговый PDF перед отправкой.",
    },
    accentClass: "from-sky-500/15 to-cyan-500/10",
    toolSlugs: ["merge-pdf", "pdf-page-numbers", "protect-pdf"],
  },
  {
    id: "scan-to-searchable",
    title: {
      en: "Turn a scan into a searchable file",
      ru: "Сделать скан читаемым и лёгким",
    },
    description: {
      en: "Run OCR, reduce file size, and sign the finished document in a clean flow.",
      ru: "Распознайте текст, уменьшите размер файла и подпишите результат в одном сценарии.",
    },
    accentClass: "from-emerald-500/15 to-teal-500/10",
    toolSlugs: ["ocr-pdf", "compress-pdf", "sign-pdf"],
  },
  {
    id: "extract-and-edit",
    title: {
      en: "Extract content and ship it back as PDF",
      ru: "Извлечь контент и вернуть в PDF",
    },
    description: {
      en: "Open the content in Word, make edits, and export the final version back to PDF.",
      ru: "Откройте контент в Word, внесите правки и соберите финальную версию обратно в PDF.",
    },
    accentClass: "from-violet-500/15 to-indigo-500/10",
    toolSlugs: ["pdf-to-word", "word-to-pdf", "protect-pdf"],
  },
  {
    id: "clean-and-brand",
    title: {
      en: "Clean up and brand a PDF",
      ru: "Очистить и брендировать PDF",
    },
    description: {
      en: "Remove extra pages, reorder the document, and add a watermark for delivery.",
      ru: "Удалите лишние страницы, переупорядочьте документ и добавьте водяной знак перед публикацией.",
    },
    accentClass: "from-amber-500/15 to-orange-500/10",
    toolSlugs: ["delete-pages", "reorder-pages", "watermark-pdf"],
  },
  {
    id: "email-ready",
    title: {
      en: "Prepare PDFs for email",
      ru: "Подготовить PDF для email",
    },
    description: {
      en: "Repair the file, compress it, and split large documents into sendable parts.",
      ru: "Почините файл, уменьшите размер и разделите большой документ на части для отправки.",
    },
    accentClass: "from-emerald-500/15 to-teal-500/10",
    toolSlugs: ["repair-pdf", "compress-pdf", "split-pdf"],
  },
  {
    id: "pre-publish-cleanup",
    title: {
      en: "Clean before publishing",
      ru: "Очистить перед публикацией",
    },
    description: {
      en: "Flatten forms, redact sensitive text, and compress the final public PDF.",
      ru: "Закрепите формы, скройте чувствительный текст и сожмите итоговый публичный PDF.",
    },
    accentClass: "from-sky-500/15 to-cyan-500/10",
    toolSlugs: ["flatten-pdf", "redact-pdf", "compress-pdf"],
  },
  {
    id: "image-extract-workflow",
    title: {
      en: "Extract content from PDF",
      ru: "Извлечь контент из PDF",
    },
    description: {
      en: "Extract all images and export text content from your PDF document.",
      ru: "Извлеките все изображения и текстовый контент из PDF-документа.",
    },
    accentClass: "from-pink-500/15 to-rose-500/10",
    toolSlugs: ["extract-images", "pdf-to-text"],
  },
  {
    id: "anonymize-pdf",
    title: {
      en: "Anonymize a document",
      ru: "Анонимизировать документ",
    },
    description: {
      en: "Clear metadata, redact sensitive content, and compress the final file.",
      ru: "Очистите метаданные, скройте чувствительный текст и сожмите итоговый файл.",
    },
    accentClass: "from-amber-500/15 to-yellow-500/10",
    toolSlugs: ["pdf-metadata", "redact-pdf", "compress-pdf"],
  },
  {
    id: "print-ready",
    title: {
      en: "Prepare for print",
      ru: "Подготовить к печати",
    },
    description: {
      en: "Crop margins, add page numbers, and compress before sending to print.",
      ru: "Обрежьте поля, добавьте нумерацию и сожмите перед отправкой в печать.",
    },
    accentClass: "from-teal-500/15 to-cyan-500/10",
    toolSlugs: ["crop-pdf", "pdf-page-numbers", "compress-pdf"],
  },
];

function pick(copy: Copy, lang: LangCode) {
  return lang === "ru" ? copy.ru : copy.en;
}

function resolveTools(toolSlugs: string[]) {
  return toolSlugs
    .map((slug) => getToolBySlug(slug))
    .filter((tool): tool is Tool => Boolean(tool))
    .filter((tool) => isToolLaunchReady(tool));
}

export function getWorkflowPlaybooks(lang: LangCode): WorkflowPlaybook[] {
  return workflowDefinitions
    .map((workflow) => ({
      id: workflow.id,
      title: pick(workflow.title, lang),
      description: pick(workflow.description, lang),
      accentClass: workflow.accentClass,
      tools: resolveTools(workflow.toolSlugs),
    }))
    .filter((workflow) => workflow.tools.length >= 2);
}

export function getWorkflowSuggestionsForTool(slug: string, lang: LangCode): WorkflowSuggestion[] {
  return getWorkflowPlaybooks(lang)
    .flatMap((workflow) => {
      const currentIndex = workflow.tools.findIndex((tool) => tool.slug === slug);

      if (currentIndex === -1 || currentIndex === workflow.tools.length - 1) {
        return [];
      }

      const nextTool = workflow.tools[currentIndex + 1];
      if (!nextTool) {
        return [];
      }

      return [{
        ...workflow,
        nextTool,
        remainingTools: workflow.tools.slice(currentIndex + 1),
      }];
    })
    .slice(0, 2);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readRecentToolSlugs() {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_TOOLS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((slug): slug is string => typeof slug === "string");
  } catch {
    return [];
  }
}

export function rememberRecentTool(slug: string) {
  if (!isBrowser() || !getToolBySlug(slug) || !isToolLaunchReady(slug)) {
    return;
  }

  const next = [slug, ...readRecentToolSlugs().filter((item) => item !== slug)].slice(0, MAX_RECENT_TOOLS);
  window.localStorage.setItem(RECENT_TOOLS_STORAGE_KEY, JSON.stringify(next));
}

export function getRecentTools(limit = 4): Tool[] {
  return readRecentToolSlugs()
    .map((slug) => getToolBySlug(slug))
    .filter((tool): tool is Tool => Boolean(tool))
    .filter((tool) => isToolLaunchReady(tool))
    .slice(0, limit);
}
