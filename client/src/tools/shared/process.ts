import { runPdfTask, type RunPdfTaskOptions } from "@/workers/worker-client";
import type { ToolOutputKind, ToolRegistryEntry } from "../types";

export type ToolTextResultTarget = "text" | "html";

export interface ToolTextResult {
  bytes: Uint8Array;
  content: string;
  target: ToolTextResultTarget;
}

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

export async function runToolMainThreadTask<T>(
  entry: ToolRegistryEntry,
  task: () => Promise<T>
): Promise<T> {
  if (entry.execution.mode !== "main-thread" || entry.execution.workerOp) {
    throw new Error(`Tool "${entry.slug}" is not registered as a main-thread tool.`);
  }

  return task();
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
