import { runPdfTask, type RunPdfTaskOptions } from "@/workers/worker-client";
import type { ToolOutputKind, ToolRegistryEntry } from "../types";

export type ToolTextResultTarget = "text" | "html";

export interface ToolTextResult {
  bytes: Uint8Array;
  content: string;
  target: ToolTextResultTarget;
}

export interface ToolNamedBytesPart {
  name: string;
  bytes: Uint8Array;
}

export interface ToolNamedPartsResultOptions {
  singlePartMode?: "bytes" | "zip";
}

export type ToolImageArchiveFormat = "jpg" | "png";

export interface ToolImageArchiveItem {
  dataUrl: string;
  page: number;
}

export type ToolMetadataFields = Record<string, string>;

export type ToolMetadataResult =
  | { status: "loaded"; fields: ToolMetadataFields }
  | { status: "saved"; bytes: Uint8Array };

const TEXT_RESULT_TARGET_BY_OUTPUT_KIND: Partial<Record<ToolOutputKind, ToolTextResultTarget>> = {
  html: "html",
  json: "text",
  markdown: "text",
  text: "text",
};

export function shouldSimulateToolProgress(entry: ToolRegistryEntry): boolean {
  return entry.execution.progress === "simulated";
}

export function createToolTextResult(
  entry: ToolRegistryEntry,
  content: string
): ToolTextResult {
  const target = TEXT_RESULT_TARGET_BY_OUTPUT_KIND[entry.output.kind];

  if (!target) {
    throw new Error(`Tool "${entry.slug}" does not produce a text-like result.`);
  }

  return {
    bytes: new TextEncoder().encode(content),
    content,
    target,
  };
}

export async function createToolNamedPartsResult(
  entry: ToolRegistryEntry,
  parts: ToolNamedBytesPart[],
  options: ToolNamedPartsResultOptions = {}
): Promise<Uint8Array> {
  if (entry.output.kind !== "zip") {
    throw new Error(`Tool "${entry.slug}" does not produce a split archive result.`);
  }

  const firstPart = parts[0];

  if (!firstPart) {
    throw new Error(`Tool "${entry.slug}" did not produce any split parts.`);
  }

  if (parts.length === 1 && options.singlePartMode !== "zip") {
    return firstPart.bytes;
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const part of parts) {
    zip.file(part.name, part.bytes);
  }

  return zip.generateAsync({ type: "uint8array" });
}

export async function createToolNumberedPartsResult(
  entry: ToolRegistryEntry,
  parts: Uint8Array[],
  baseName: string,
  options: ToolNamedPartsResultOptions = {}
): Promise<Uint8Array> {
  const padLength = String(parts.length).length;
  const namedParts = parts.map((bytes, index) => {
    const partNumber = String(index + 1).padStart(padLength, "0");

    return {
      name: `${baseName}-part${partNumber}.pdf`,
      bytes,
    };
  });

  return createToolNamedPartsResult(entry, namedParts, options);
}

export async function createToolImageArchiveResult(
  entry: ToolRegistryEntry,
  images: ToolImageArchiveItem[],
  format: ToolImageArchiveFormat,
  baseName: string
): Promise<Uint8Array> {
  if (entry.output.kind !== "zip") {
    throw new Error(`Tool "${entry.slug}" does not produce an image archive result.`);
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const image of images) {
    const base64 = image.dataUrl.split(",")[1];

    if (!base64) {
      continue;
    }

    zip.file(`${baseName}-page-${image.page}.${format}`, base64, { base64: true });
  }

  return zip.generateAsync({ type: "uint8array" });
}

export async function runToolMainThreadTask<T>(
  entry: ToolRegistryEntry,
  task: () => Promise<T>
): Promise<T> {
  if (entry.execution.mode !== "main-thread" || entry.execution.workerOp) {
    throw new Error(`Tool "${entry.slug}" is not registered as a main-thread tool.`);
  }

  return task();
}

export async function runToolAudioSideEffectTask(
  entry: ToolRegistryEntry,
  task: () => Promise<void>
): Promise<void> {
  if (entry.output.kind !== "audio") {
    throw new Error(`Tool "${entry.slug}" does not produce an audio side-effect result.`);
  }

  await runToolMainThreadTask(entry, task);
}

export async function runToolMetadataEditTask(
  entry: ToolRegistryEntry,
  isLoaded: boolean,
  loadMetadata: () => Promise<ToolMetadataFields>,
  saveMetadata: () => Promise<Uint8Array>
): Promise<ToolMetadataResult> {
  if (entry.slug !== "pdf-metadata") {
    throw new Error(`Tool "${entry.slug}" is not registered as a metadata editor.`);
  }

  if (!isLoaded) {
    const fields = await runToolMainThreadTask(entry, loadMetadata);

    return { status: "loaded", fields };
  }

  const bytes = await runToolMainThreadTask(entry, saveMetadata);

  return { status: "saved", bytes };
}

export async function runToolWorkerTask<T>(
  entry: ToolRegistryEntry,
  fallback: () => Promise<T>,
  options: RunPdfTaskOptions
): Promise<T> {
  const workerOp = entry.execution.workerOp;

  if (!workerOp) {
    throw new Error(`Tool "${entry.slug}" is missing worker metadata.`);
  }

  return runPdfTask(workerOp, fallback, options);
}
