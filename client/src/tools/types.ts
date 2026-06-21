import type { ToolMaturity } from "@/lib/tools";
import type { WorkerOp } from "@/workers/pdf-worker-types";

export type ToolCategoryId =
  | "convert-from"
  | "convert-to"
  | "organize"
  | "security"
  | "optimize"
  | "ocr"
  | "utility";

export type ToolExecutionMode = "worker" | "main-thread" | "hybrid";
export type ToolProgressMode = "simulated" | "callback";

export type ToolOutputKind =
  | "pdf"
  | "zip"
  | "text"
  | "html"
  | "docx"
  | "xlsx"
  | "pptx"
  | "json"
  | "markdown"
  | "audio"
  | "image";

export interface ToolOutputDefinition {
  kind: ToolOutputKind;
  extension: string;
  mimeType: string;
}

export interface ToolSearchKeywords {
  en: string[];
  ru: string[];
}

export interface ToolLimitDefinition {
  maxFilesMb: number;
  multiple: boolean;
  accept: string;
}

export interface ToolExecutionDefinition {
  mode: ToolExecutionMode;
  workerOp?: WorkerOp;
  progress: ToolProgressMode;
}

export interface ToolRegistryEntry {
  slug: string;
  name: string;
  description: string;
  category: ToolCategoryId;
  maturity: ToolMaturity;
  limits: ToolLimitDefinition;
  output: ToolOutputDefinition;
  execution: ToolExecutionDefinition;
  search: ToolSearchKeywords;
}
