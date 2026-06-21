import { DEFAULT_MAX_FILE_SIZE_MB } from "@/lib/upload-limits";
import {
  getToolMaturity,
  tools,
  type Tool,
} from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import type { ToolRegistryEntry, ToolCategoryId, ToolOutputDefinition } from "./types";
import type { WorkerOp } from "@/workers/pdf-worker-types";

const WORKER_OP_BY_SLUG: Partial<Record<string, WorkerOp>> = {
  "redact-pdf": "redactPdf",
  "pdf-to-jpg": "pdfToImages",
  "pdf-to-png": "pdfToImages",
  "invert-colors": "invertColors",
  "to-single-page": "toSinglePage",
  "booklet-imposition": "bookletImposition",
  "scanner-effect": "scannerEffect",
  "compare-pdf": "comparePdf",
  "remove-blank-pages": "removeBlankPages",
  "grayscale-pdf": "grayscalePdf",
  "auto-redact": "autoRedactPdf",
  "n-up-pdf": "nUpPdf",
  "extract-images": "pdfToImages",
  "pdf-diff": "pdfDiff",
  "pdf-to-pptx": "pdfToPptx",
};

const ZIP_OUTPUT_SLUGS = new Set([
  "split-pdf",
  "pdf-to-jpg",
  "pdf-to-png",
  "extract-images",
  "split-by-size",
  "split-by-chapters",
]);

const JSON_OUTPUT_SLUGS = new Set(["extract-forms"]);
const TEXT_OUTPUT_SLUGS = new Set(["pdf-to-text", "pdf-bookmarks"]);
const HTML_OUTPUT_SLUGS = new Set(["pdf-to-html"]);
const MARKDOWN_OUTPUT_SLUGS = new Set(["pdf-to-markdown"]);
const AUDIO_OUTPUT_SLUGS = new Set(["pdf-to-audio"]);

function outputMime(kind: ToolOutputDefinition["kind"]): string {
  if (kind === "zip") return "application/zip";
  if (kind === "text") return "text/plain";
  if (kind === "html") return "text/html";
  if (kind === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (kind === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (kind === "pptx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (kind === "json") return "application/json";
  if (kind === "markdown") return "text/markdown";
  if (kind === "audio") return "audio/mpeg";
  if (kind === "image") return "image/*";
  return "application/pdf";
}

function getOutputDefinition(tool: Tool): ToolOutputDefinition {
  const slug = tool.slug;

  if (ZIP_OUTPUT_SLUGS.has(slug)) {
    return { kind: "zip", extension: "zip", mimeType: outputMime("zip") };
  }

  if (JSON_OUTPUT_SLUGS.has(slug)) {
    return { kind: "json", extension: "json", mimeType: outputMime("json") };
  }

  if (TEXT_OUTPUT_SLUGS.has(slug)) {
    return { kind: "text", extension: "txt", mimeType: outputMime("text") };
  }

  if (HTML_OUTPUT_SLUGS.has(slug)) {
    return { kind: "html", extension: "html", mimeType: outputMime("html") };
  }

  if (MARKDOWN_OUTPUT_SLUGS.has(slug)) {
    return { kind: "markdown", extension: "md", mimeType: outputMime("markdown") };
  }

  if (AUDIO_OUTPUT_SLUGS.has(slug)) {
    return { kind: "audio", extension: "mp3", mimeType: outputMime("audio") };
  }

  const extension = tool.outputExt ?? "pdf";
  const kind = extension === "jpg" || extension === "png" ? "image" : extension;

  return {
    kind: kind as ToolOutputDefinition["kind"],
    extension,
    mimeType: outputMime(kind as ToolOutputDefinition["kind"]),
  };
}

function splitKeywords(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildSearchKeywords(tool: Tool): ToolRegistryEntry["search"] {
  const en = getToolTranslation(tool.slug, "en");
  const ru = getToolTranslation(tool.slug, "ru");

  return {
    en: unique([tool.slug, tool.category, ...splitKeywords(en.name), ...splitKeywords(en.description)]),
    ru: unique([tool.slug, tool.category, ...splitKeywords(ru.name), ...splitKeywords(ru.description)]),
  };
}

function toRegistryEntry(tool: Tool): ToolRegistryEntry {
  const workerOp = WORKER_OP_BY_SLUG[tool.slug];

  return {
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    category: tool.category as ToolCategoryId,
    maturity: getToolMaturity(tool),
    limits: {
      maxFilesMb: tool.maxFilesMb ?? DEFAULT_MAX_FILE_SIZE_MB,
      multiple: Boolean(tool.multiple),
      accept: tool.accept ?? ".pdf",
    },
    output: getOutputDefinition(tool),
    execution: {
      mode: workerOp ? "hybrid" : "main-thread",
      workerOp,
    },
    search: buildSearchKeywords(tool),
  };
}

export const toolRegistry = tools.map(toRegistryEntry);

export function getToolRegistryEntry(slug: string): ToolRegistryEntry | undefined {
  return toolRegistry.find((entry) => entry.slug === slug);
}

export function getToolsByExecutionMode(mode: ToolRegistryEntry["execution"]["mode"]): ToolRegistryEntry[] {
  return toolRegistry.filter((entry) => entry.execution.mode === mode);
}
